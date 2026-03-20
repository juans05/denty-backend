const prisma = require('../utils/prisma');
const { notifyPatientNewAppointment, notifyDoctorNewAppointment, notifyPatientCancellation } = require('../services/notificationService');

// ── Helpers de validación de horario ────────────────────────────────────────

// Verifica si la cita cae dentro del horario configurado del médico
// Retorna { ok: true } o { ok: false, msg: '...' }
async function checkSchedule(doctorId, branchId, appointmentDate, duration) {
    const dayOfWeek = appointmentDate.getDay();

    const schedule = await prisma.doctorSchedule.findUnique({
        where: { doctorId_branchId_dayOfWeek: { doctorId, branchId, dayOfWeek } }
    });

    // Sin configuración → comportamiento legacy: Dom bloqueado, resto libre
    if (!schedule) {
        if (dayOfWeek === 0) {
            return { ok: false, msg: 'El médico no trabaja los domingos' };
        }
        return { ok: true };
    }

    if (!schedule.active) {
        const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return { ok: false, msg: `El médico no trabaja los ${DAY_NAMES[dayOfWeek]}` };
    }

    const [sh, sm] = schedule.startTime.split(':').map(Number);
    const [eh, em] = schedule.endTime.split(':').map(Number);
    const schedStart  = sh * 60 + sm;
    const schedEnd    = eh * 60 + em;
    const appStart    = appointmentDate.getHours() * 60 + appointmentDate.getMinutes();
    const appEnd      = appStart + duration;

    if (appStart < schedStart || appEnd > schedEnd) {
        return { ok: false, msg: `El médico trabaja de ${schedule.startTime} a ${schedule.endTime}` };
    }

    return { ok: true };
}

// Verifica si el slot está dentro de un bloqueo
async function checkBlockedSlot(doctorId, branchId, startAt, endAt) {
    const blocked = await prisma.blockedSlot.findFirst({
        where: {
            branchId,
            startAt: { lte: endAt },
            endAt:   { gte: startAt },
            OR: [{ doctorId: null }, { doctorId }]
        }
    });
    if (blocked) {
        return { ok: false, msg: blocked.reason ? `Horario bloqueado: ${blocked.reason}` : 'Horario bloqueado' };
    }
    return { ok: true };
}

const getAppointments = async (req, res) => {
    try {
        const { companyId, branchId } = req.user;
        const { start, end, doctorId, branchId: queryBranchId, patientId } = req.query;

        const where = { branch: { companyId } };

        if (queryBranchId) {
            where.branchId = parseInt(queryBranchId);
        } else if (branchId && req.user.role !== 'ADMIN') {
            where.branchId = parseInt(branchId);
        }

        if (start && end) {
            where.date = { gte: new Date(start), lte: new Date(end) };
        }

        if (doctorId) {
            where.doctorId = parseInt(doctorId);
        }

        if (patientId) {
            where.patientId = parseInt(patientId);
        }

        const appointments = await prisma.appointment.findMany({
            where,
            include: {
                patient: {
                    select: { id: true, firstName: true, paternalSurname: true, maternalSurname: true, phoneMobile: true }
                },
                doctor: {
                    select: { id: true, name: true, role: true }
                },
                treatmentItems: {
                    include: {
                        service: {
                            select: { id: true, name: true, category: true, price: true }
                        }
                    }
                }
            },
            orderBy: { date: 'desc' }
        });

        res.json(appointments);
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ message: 'Error al obtener citas', error: error.message });
    }
};

const createAppointment = async (req, res) => {
    try {
        const { branchId: userBranchId } = req.user;
        const { date, notes, patientId, doctorId, reason, urgency, duration, branchId: bodyBranchId, consultoryId } = req.body;

        // Use branchId from body (quick-book modal) first, fall back to user's default branch
        const branchId = bodyBranchId || userBranchId;

        if (!branchId) {
            return res.status(400).json({ message: 'El usuario debe estar asociado a una sede para crear citas.' });
        }
        if (!patientId || !doctorId || !date) {
            return res.status(400).json({ message: 'Campos requeridos: fecha, paciente, doctor.' });
        }

        const appointmentDate = new Date(date);
        const appDuration = duration ? parseInt(duration) : 30;
        const endTime = new Date(appointmentDate.getTime() + appDuration * 60000);

        // Check for overlaps with the same doctor
        const overlap = await prisma.appointment.findFirst({
            where: {
                doctorId: parseInt(doctorId),
                branchId: parseInt(branchId),
                status: { in: ['SCHEDULED', 'CONFIRMED'] },
                OR: [
                    {
                        // New appointment starts during an existing one
                        date: { lte: appointmentDate },
                        // This logic assumes end time = date + duration
                        // Since we don't store endTime explicitly, we calculate it on the fly or simplify
                    }
                ]
            }
        });

        // Refined overlap check: 
        // An overlap exists if: (startA < endB) AND (endA > startB)
        const allPotentialOverlaps = await prisma.appointment.findMany({
            where: {
                doctorId: parseInt(doctorId),
                branchId: parseInt(branchId),
                status: { in: ['SCHEDULED', 'CONFIRMED'] },
                date: {
                    gte: new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000), // Check within 24h
                    lte: new Date(appointmentDate.getTime() + 24 * 60 * 60 * 1000)
                }
            }
        });

        const isOverlapping = allPotentialOverlaps.some(app => {
            const startB = new Date(app.date);
            const endB = new Date(startB.getTime() + (app.duration || 30) * 60000);
            return (appointmentDate < endB) && (endTime > startB);
        });

        if (isOverlapping) {
            return res.status(409).json({ message: 'El doctor ya tiene una cita programada en este horario.' });
        }

        // ── Validar horario del médico ──────────────────────────────────────
        const scheduleCheck = await checkSchedule(
            parseInt(doctorId), parseInt(branchId), appointmentDate, appDuration
        );
        if (!scheduleCheck.ok) {
            return res.status(409).json({ message: scheduleCheck.msg });
        }

        // ── Validar bloqueos ────────────────────────────────────────────────
        const endTime2 = new Date(appointmentDate.getTime() + appDuration * 60000);
        const blockedCheck = await checkBlockedSlot(
            parseInt(doctorId), parseInt(branchId), appointmentDate, endTime2
        );
        if (!blockedCheck.ok) {
            return res.status(409).json({ message: blockedCheck.msg });
        }

        const appointment = await prisma.appointment.create({
            data: {
                date: appointmentDate,
                notes: notes || null,
                reason: reason || null,
                urgency: urgency || 'NORMAL',
                duration: appDuration,
                patientId: parseInt(patientId),
                doctorId: parseInt(doctorId),
                branchId: parseInt(branchId),
                consultoryId: consultoryId ? parseInt(consultoryId) : null,
                status: 'SCHEDULED'
            },
            include: {
                patient: { select: { id: true, firstName: true, paternalSurname: true, email: true } },
                doctor:  { select: { id: true, name: true, email: true } },
                branch:  { select: { name: true } }
            }
        });

        // ── Notificaciones (no bloquean la respuesta) ──────────────────────
        const company = await prisma.company.findUnique({
            where: { id: parseInt(req.user.companyId) },
            select: { name: true, commercialName: true }
        });
        const companyName = company?.commercialName || company?.name || 'Clínica Dental';
        const branchName  = appointment.branch?.name || '';

        notifyPatientNewAppointment({
            patient: appointment.patient,
            doctor: appointment.doctor,
            appointment,
            branchName,
            companyName
        }).catch(() => {});

        notifyDoctorNewAppointment({
            doctor: appointment.doctor,
            patient: appointment.patient,
            appointment,
            branchName
        }).catch(() => {});

        res.status(201).json(appointment);
    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({ message: 'Error al crear la cita', error: error.message });
    }
};

const updateAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, notes, status, doctorId, reason, urgency, duration, consultoryId } = req.body;

        const appointmentId = parseInt(id);
        const existingApp = await prisma.appointment.findUnique({ where: { id: appointmentId } });

        if (!existingApp) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }

        const newDate = date ? new Date(date) : new Date(existingApp.date);
        const newDuration = duration ? parseInt(duration) : (existingApp.duration || 30);
        const newDoctorId = doctorId ? parseInt(doctorId) : existingApp.doctorId;
        const newEndTime = new Date(newDate.getTime() + newDuration * 60000);

        // Check for overlaps (excluding current appointment)
        const allPotentialOverlaps = await prisma.appointment.findMany({
            where: {
                id: { not: appointmentId },
                doctorId: newDoctorId,
                branchId: existingApp.branchId,
                status: { in: ['SCHEDULED', 'CONFIRMED'] },
                date: {
                    gte: new Date(newDate.getTime() - 24 * 60 * 60 * 1000),
                    lte: new Date(newDate.getTime() + 24 * 60 * 60 * 1000)
                }
            }
        });

        const isOverlapping = allPotentialOverlaps.some(app => {
            const startB = new Date(app.date);
            const endB = new Date(startB.getTime() + (app.duration || 30) * 60000);
            return (newDate < endB) && (newEndTime > startB);
        });

        if (isOverlapping) {
            return res.status(409).json({ message: 'El doctor ya tiene una cita programada en este horario.' });
        }

        const appointment = await prisma.appointment.update({
            where: { id: appointmentId },
            data: {
                ...(date && { date: newDate }),
                ...(notes !== undefined && { notes }),
                ...(status && { status }),
                ...(doctorId && { doctorId: newDoctorId }),
                ...(reason !== undefined && { reason }),
                ...(urgency && { urgency }),
                ...(duration && { duration: newDuration }),
                ...(consultoryId !== undefined && { consultoryId: consultoryId ? parseInt(consultoryId) : null }),
                updatedAt: new Date()
            },
            include: {
                patient: { select: { id: true, firstName: true, paternalSurname: true, email: true } }
            }
        });

        // Notificar cancelación al paciente
        if (status === 'CANCELLED' && existingApp.status !== 'CANCELLED') {
            const company = await prisma.company.findUnique({
                where: { id: parseInt(req.user.companyId) },
                select: { name: true, commercialName: true }
            });
            notifyPatientCancellation({
                patient: appointment.patient,
                appointment,
                companyName: company?.commercialName || company?.name || 'Clínica Dental'
            }).catch(() => {});
        }

        res.json(appointment);
    } catch (error) {
        console.error('Error updating appointment:', error);
        res.status(500).json({ message: 'Error al actualizar la cita', error: error.message });
    }
};

const deleteAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.appointment.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Cita eliminada exitosamente' });
    } catch (error) {
        console.error('Error deleting appointment:', error);
        res.status(500).json({ message: 'Error al eliminar la cita', error: error.message });
    }
};

// PUT /api/appointments/:id/attend
// Marks appointment as ATTENDED and saves services performed (TreatmentItems)
const attendAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { services, notes } = req.body;
        // services: [{ serviceId, toothNumber?, notes?, price? }]

        const appointmentId = parseInt(id);

        // Verify appointment exists
        const existing = await prisma.appointment.findUnique({
            where: { id: appointmentId }
        });
        if (!existing) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }

        // Run in a transaction: update status + replace treatmentItems
        const result = await prisma.$transaction(async (tx) => {
            // 1. Delete previous treatment items for this appointment
            await tx.treatmentItem.deleteMany({
                where: { appointmentId }
            });

            // 2. Update appointment status and notes
            const updated = await tx.appointment.update({
                where: { id: appointmentId },
                data: {
                    status: 'ATTENDED',
                    ...(notes !== undefined && { notes }),
                    updatedAt: new Date()
                }
            });

            // 3. Create new treatment items if any services provided
            if (services && services.length > 0) {
                // Fetch prices for services not overriding
                const serviceIds = services.map(s => s.serviceId);
                const catalog = await tx.service.findMany({
                    where: { id: { in: serviceIds } },
                    select: { id: true, price: true }
                });
                const priceMap = Object.fromEntries(catalog.map(s => [s.id, s.price]));

                await tx.treatmentItem.createMany({
                    data: services.map(s => ({
                        serviceId: s.serviceId,
                        toothNumber: s.toothNumber || null,
                        notes: s.notes || null,
                        price: s.price !== undefined ? s.price : (priceMap[s.serviceId] || 0),
                        status: 'COMPLETED',
                        appointmentId,
                        // No treatmentPlanId — this is a standalone visit service
                        treatmentPlanId: s.treatmentPlanId || null
                    }))
                });
            }

            return updated;
        });

        // Return updated appointment with items
        const full = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: {
                patient: { select: { id: true, firstName: true, paternalSurname: true } },
                doctor: { select: { id: true, name: true } },
                treatmentItems: {
                    include: {
                        service: { select: { id: true, name: true, category: true, price: true } }
                    }
                }
            }
        });

        res.json(full);
    } catch (error) {
        console.error('Error attending appointment:', error);
        res.status(500).json({ message: 'Error al registrar la atención', error: error.message });
    }
};

// GET /api/appointments/doctors?branchId=X — doctors that work at a branch
const getDoctorsByBranch = async (req, res) => {
    try {
        const companyId = parseInt(req.user.companyId);
        const branchId = parseInt(req.query.branchId);

        if (!branchId) return res.status(400).json({ message: 'Se requiere branchId' });

        // Get doctors who have appointments at this branch OR all company doctors
        const doctors = await prisma.user.findMany({
            where: {
                companyId,
                role: { in: ['DENTIST', 'ADMIN'] },
                active: true,
            },
            select: { id: true, name: true, role: true },
            orderBy: { name: 'asc' }
        });

        res.json(doctors);
    } catch (error) {
        console.error('Error getDoctorsByBranch:', error);
        res.status(500).json({ message: 'Error al obtener doctores', error: error.message });
    }
};

// GET /api/appointments/slots?doctorId=X&date=YYYY-MM-DD&branchId=X&duration=30
// Returns available time slots for a doctor on a given date
const getAvailableSlots = async (req, res) => {
    try {
        const { doctorId, date, branchId, duration } = req.query;

        if (!doctorId || !date || !branchId) {
            return res.status(400).json({ message: 'doctorId, date y branchId son requeridos' });
        }

        const slotDuration = parseInt(duration) || 30; // minutes
        const dayStart = new Date(`${date}T00:00:00`);
        const dayEnd = new Date(`${date}T23:59:59`);

        const dayOfWeek = new Date(`${date}T12:00:00`).getDay();

        // Horario del médico para este día
        const schedule = await prisma.doctorSchedule.findUnique({
            where: { doctorId_branchId_dayOfWeek: {
                doctorId: parseInt(doctorId),
                branchId: parseInt(branchId),
                dayOfWeek
            }}
        });

        // Si el día está inactivo → sin slots
        if (schedule && !schedule.active) {
            return res.json([]);
        }

        // Rango de trabajo efectivo
        const [sh, sm] = schedule ? schedule.startTime.split(':').map(Number) : [8, 0];
        const [eh, em] = schedule ? schedule.endTime.split(':').map(Number)   : [20, 0];
        const workStart = sh * 60 + sm;
        const workEnd   = eh * 60 + em;

        // Si no hay schedule y es domingo → sin slots
        if (!schedule && dayOfWeek === 0) return res.json([]);

        // Citas ocupadas
        const booked = await prisma.appointment.findMany({
            where: {
                doctorId: parseInt(doctorId),
                branchId: parseInt(branchId),
                status: { in: ['SCHEDULED', 'CONFIRMED'] },
                date: { gte: dayStart, lte: dayEnd }
            }
        });

        // Bloqueos que afectan este día
        const blocked = await prisma.blockedSlot.findMany({
            where: {
                branchId: parseInt(branchId),
                startAt: { lte: dayEnd },
                endAt:   { gte: dayStart },
                OR: [{ doctorId: null }, { doctorId: parseInt(doctorId) }]
            }
        });

        const slots = [];
        for (let m = workStart; m < workEnd; m += slotDuration) {
            const slotStart = new Date(`${date}T00:00:00`);
            slotStart.setMinutes(m);
            const slotEnd = new Date(slotStart.getTime() + slotDuration * 60000);

            const isOccupied = booked.some(app => {
                const appStart = new Date(app.date);
                const appEnd   = new Date(appStart.getTime() + (app.duration || 30) * 60000);
                return (slotStart < appEnd) && (slotEnd > appStart);
            });

            const isBlocked = blocked.some(b => slotStart < b.endAt && slotEnd > b.startAt);
            const isPast    = slotStart < new Date();

            slots.push({
                time: slotStart.toISOString(),
                label: slotStart.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true }),
                available: !isOccupied && !isBlocked && !isPast,
                occupied: isOccupied,
                blocked: isBlocked
            });
        }

        res.json(slots);
    } catch (error) {
        console.error('Error getAvailableSlots:', error);
        res.status(500).json({ message: 'Error al obtener horarios', error: error.message });
    }
};

// GET /api/appointments/available-days?doctorId=X&branchId=X&year=2026&month=3
// Returns all days of the given month with their availability status
const getAvailableDays = async (req, res) => {
    try {
        const { doctorId, branchId, year, month, duration } = req.query;

        if (!doctorId || !branchId || !year || !month) {
            return res.status(400).json({ message: 'doctorId, branchId, year y month son requeridos' });
        }

        const slotDuration = parseInt(duration) || 30;
        const y = parseInt(year);
        const m = parseInt(month) - 1; // JS months 0-indexed
        const daysInMonth = new Date(y, m + 1, 0).getDate();

        const monthStart = new Date(y, m, 1);
        const monthEnd   = new Date(y, m, daysInMonth, 23, 59, 59);

        // Cargar horarios del médico (todos los días configurados)
        const schedules = await prisma.doctorSchedule.findMany({
            where: { doctorId: parseInt(doctorId), branchId: parseInt(branchId) }
        });
        const scheduleMap = Object.fromEntries(schedules.map(s => [s.dayOfWeek, s]));

        // Bloqueos del mes
        const blockedMonth = await prisma.blockedSlot.findMany({
            where: {
                branchId: parseInt(branchId),
                startAt: { lte: monthEnd },
                endAt:   { gte: monthStart },
                OR: [{ doctorId: null }, { doctorId: parseInt(doctorId) }]
            }
        });

        const booked = await prisma.appointment.findMany({
            where: {
                doctorId: parseInt(doctorId),
                branchId: parseInt(branchId),
                status: { in: ['SCHEDULED', 'CONFIRMED'] },
                date: { gte: monthStart, lte: monthEnd }
            },
            select: { date: true, duration: true }
        });

        const now    = new Date();
        const result = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const dateObj   = new Date(y, m, day);
            const dayOfWeek = dateObj.getDay();
            const dateStr   = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isPast    = dateObj < new Date(now.getFullYear(), now.getMonth(), now.getDate());

            if (isPast) {
                result.push({ date: dateStr, available: false, isPast, slots: 0 });
                continue;
            }

            // Verificar si el médico trabaja ese día
            const sched = scheduleMap[dayOfWeek];
            if (sched && !sched.active) {
                result.push({ date: dateStr, available: false, isOff: true, slots: 0 });
                continue;
            }
            if (!sched && dayOfWeek === 0) {
                result.push({ date: dateStr, available: false, isWeekend: true, slots: 0 });
                continue;
            }

            const [sh, sm2] = sched ? sched.startTime.split(':').map(Number) : [8, 0];
            const [eh, em2] = sched ? sched.endTime.split(':').map(Number)   : [20, 0];
            const workStart = sh * 60 + sm2;
            const workEnd   = eh * 60 + em2;
            const totalSlots = Math.floor((workEnd - workStart) / slotDuration);

            const dayBooked = booked.filter(b => {
                const bd = new Date(b.date);
                return bd.getFullYear() === y && bd.getMonth() === m && bd.getDate() === day;
            });

            let availableSlots = 0;
            for (let mins = workStart; mins < workEnd; mins += slotDuration) {
                const slotStart = new Date(y, m, day, 0, mins);
                const slotEnd   = new Date(slotStart.getTime() + slotDuration * 60000);

                const occupied  = dayBooked.some(app => {
                    const as = new Date(app.date);
                    const ae = new Date(as.getTime() + (app.duration || 30) * 60000);
                    return (slotStart < ae) && (slotEnd > as);
                });
                const isBlocked = blockedMonth.some(b => slotStart < b.endAt && slotEnd > b.startAt);
                const isPastSlot = slotStart < now;

                if (!occupied && !isBlocked && !isPastSlot) availableSlots++;
            }

            result.push({
                date: dateStr,
                available: availableSlots > 0,
                slots: availableSlots,
                totalSlots,
                occupancy: totalSlots > 0 ? Math.round((totalSlots - availableSlots) / totalSlots * 100) : 0
            });
        }

        res.json(result);
    } catch (error) {
        console.error('Error getAvailableDays:', error);
        res.status(500).json({ message: 'Error al obtener días disponibles', error: error.message });
    }
};

module.exports = { getAppointments, createAppointment, updateAppointment, deleteAppointment, attendAppointment, getDoctorsByBranch, getAvailableSlots, getAvailableDays };
