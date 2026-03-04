const nodemailer = require('nodemailer');

// ── Transporter (opcional — si no hay SMTP configurado, se omite el envío) ──
let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
    console.log('✉️  Servicio de email inicializado:', process.env.SMTP_HOST);
} else {
    console.log('ℹ️  SMTP no configurado — las notificaciones por email están desactivadas');
}

// ── Helper interno ────────────────────────────────────────────────────────────
const send = async ({ to, subject, html }) => {
    if (!transporter) return;
    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || '"SGD Dental" <no-reply@sgddental.com>',
            to,
            subject,
            html
        });
    } catch (err) {
        // No propagamos el error para no romper el flujo de la cita
        console.error('Error al enviar email:', err.message);
    }
};

const formatDate = (d) =>
    new Date(d).toLocaleString('es-PE', {
        weekday: 'long', year: 'numeric', month: 'long',
        day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
    });

// ── Cita agendada — notificar al PACIENTE ─────────────────────────────────────
const notifyPatientNewAppointment = async ({ patient, doctor, appointment, branchName, companyName }) => {
    if (!patient?.email) return;
    await send({
        to: patient.email,
        subject: `✅ Cita confirmada — ${companyName}`,
        html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:16px">
            <h2 style="color:#0e7490;margin-bottom:4px">¡Tu cita está confirmada!</h2>
            <p style="color:#64748b;font-size:13px">Has sido registrado en <strong>${companyName}</strong></p>
            <div style="background:white;border-radius:12px;padding:20px;margin:20px 0;border-left:4px solid #06b6d4">
                <p style="margin:6px 0;font-size:14px"><strong>📅 Fecha y hora:</strong> ${formatDate(appointment.date)}</p>
                <p style="margin:6px 0;font-size:14px"><strong>👨‍⚕️ Médico:</strong> ${doctor.name}</p>
                <p style="margin:6px 0;font-size:14px"><strong>🏥 Sede:</strong> ${branchName}</p>
                ${appointment.reason ? `<p style="margin:6px 0;font-size:14px"><strong>📋 Motivo:</strong> ${appointment.reason}</p>` : ''}
            </div>
            <p style="color:#94a3b8;font-size:12px">Por favor llega 10 minutos antes de tu cita. Si necesitas cancelar o reprogramar, contáctanos con anticipación.</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
            <p style="color:#cbd5e1;font-size:11px;text-align:center">© 2026 ${companyName} — SGD Dental Suite</p>
        </div>`
    });
};

// ── Cita agendada — notificar al MÉDICO ──────────────────────────────────────
const notifyDoctorNewAppointment = async ({ doctor, patient, appointment, branchName }) => {
    if (!doctor?.email) return;
    const patientName = [patient?.firstName, patient?.paternalSurname].filter(Boolean).join(' ');
    await send({
        to: doctor.email,
        subject: `🗓️ Nueva cita — ${patientName}`,
        html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:16px">
            <h2 style="color:#1e293b;margin-bottom:4px">Nueva cita agendada</h2>
            <p style="color:#64748b;font-size:13px">Se te ha asignado una cita en <strong>${branchName}</strong></p>
            <div style="background:white;border-radius:12px;padding:20px;margin:20px 0;border-left:4px solid #6366f1">
                <p style="margin:6px 0;font-size:14px"><strong>👤 Paciente:</strong> ${patientName}</p>
                <p style="margin:6px 0;font-size:14px"><strong>📅 Fecha y hora:</strong> ${formatDate(appointment.date)}</p>
                <p style="margin:6px 0;font-size:14px"><strong>⏱️ Duración:</strong> ${appointment.duration || 30} min</p>
                ${appointment.reason ? `<p style="margin:6px 0;font-size:14px"><strong>📋 Motivo:</strong> ${appointment.reason}</p>` : ''}
                ${appointment.notes  ? `<p style="margin:6px 0;font-size:14px"><strong>📝 Notas:</strong> ${appointment.notes}</p>` : ''}
            </div>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
            <p style="color:#cbd5e1;font-size:11px;text-align:center">© 2026 SGD Dental Suite</p>
        </div>`
    });
};

// ── Cita cancelada — notificar al PACIENTE ────────────────────────────────────
const notifyPatientCancellation = async ({ patient, appointment, companyName }) => {
    if (!patient?.email) return;
    await send({
        to: patient.email,
        subject: `❌ Cita cancelada — ${companyName}`,
        html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#fff1f2;border-radius:16px">
            <h2 style="color:#e11d48;margin-bottom:4px">Tu cita ha sido cancelada</h2>
            <p style="color:#64748b;font-size:13px">La cita programada para <strong>${formatDate(appointment.date)}</strong> fue cancelada.</p>
            <p style="color:#64748b;font-size:13px">Para reagendar, por favor contacta a <strong>${companyName}</strong>.</p>
            <hr style="border:none;border-top:1px solid #fecdd3;margin:20px 0">
            <p style="color:#cbd5e1;font-size:11px;text-align:center">© 2026 ${companyName} — SGD Dental Suite</p>
        </div>`
    });
};

module.exports = {
    notifyPatientNewAppointment,
    notifyDoctorNewAppointment,
    notifyPatientCancellation
};
