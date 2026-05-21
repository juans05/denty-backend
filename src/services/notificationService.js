const { Resend } = require('resend');
const admin = require('firebase-admin');

// ── Inicialización de Resend ──────────────────────────────────────────────────
let resend = null;
if (process.env.resend_email) {
    resend = new Resend(process.env.resend_email);
    console.log('✉️  Resend (Email) inicializado');
}

// ── Inicialización de Firebase Admin ──────────────────────────────────────────
if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
        });
        console.log('🔔 Firebase Admin (Push) inicializado');
    } catch (error) {
        console.error('❌ Error al inicializar Firebase Admin:', error.message);
    }
}

// ── Funciones Base ────────────────────────────────────────────────────────────

/**
 * Envía un correo electrónico usando Resend
 */
const sendEmail = async ({ to, subject, html }) => {
    if (!resend) return;
    try {
        const { data, error } = await resend.emails.send({
            from: process.env.MAIL_FROM || 'SGD Dental <onboarding@resend.dev>',
            to: [to],
            subject,
            html,
        });
        if (error) console.error('Error Resend:', error);
    } catch (err) {
        console.error('Error al enviar email (Resend):', err.message);
    }
};

/**
 * Envía una notificación push usando Firebase Cloud Messaging
 */
const sendPushNotification = async ({ token, title, body, data = {} }) => {
    if (!token) return;
    try {
        const message = {
            notification: { title, body },
            data: { 
                ...data,
                click_action: 'FLUTTER_NOTIFICATION_CLICK' // Necesario para Flutter
            },
            token: token
        };
        const response = await admin.messaging().send(message);
        console.log('✅ Push enviado exitosamente:', response);
    } catch (err) {
        console.error('❌ Error al enviar Push:', err.message);
    }
};

const formatDate = (d) =>
    new Date(d).toLocaleString('es-PE', {
        weekday: 'long', year: 'numeric', month: 'long',
        day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
    });

// ── Lógica de Notificación Multicanal ────────────────────────────────────────

/**
 * Notifica al paciente sobre una nueva cita
 */
const notifyPatientNewAppointment = async ({ patient, doctor, appointment, branchName, companyName }) => {
    const dateStr = formatDate(appointment.date);
    const title = '✅ Cita Confirmada';
    const body = `Hola ${patient.firstName}, tu cita ha sido programada para el ${dateStr} con el Dr. ${doctor.name}.`;

    // 1. Enviar Push si tiene token
    if (patient.fcmToken) {
        await sendPushNotification({
            token: patient.fcmToken,
            title,
            body,
            data: { appointmentId: appointment.id.toString(), type: 'NEW_APPOINTMENT' }
        });
    }

    // 2. Enviar Email
    if (patient.email) {
        await sendEmail({
            to: patient.email,
            subject: title,
            html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:16px">
                <h2 style="color:#0e7490;margin-bottom:4px">¡Tu cita está confirmada!</h2>
                <p style="color:#64748b;font-size:13px">Has sido registrado en <strong>${companyName}</strong></p>
                <div style="background:white;border-radius:12px;padding:20px;margin:20px 0;border-left:4px solid #06b6d4">
                    <p style="margin:6px 0;font-size:14px"><strong>📅 Fecha y hora:</strong> ${dateStr}</p>
                    <p style="margin:6px 0;font-size:14px"><strong>👨‍⚕️ Médico:</strong> ${doctor.name}</p>
                    <p style="margin:6px 0;font-size:14px"><strong>🏥 Sede:</strong> ${branchName}</p>
                </div>
                <p style="color:#94a3b8;font-size:12px">Por favor llega 10 minutos antes. Si necesitas reprogramar, contáctanos.</p>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
                <p style="color:#cbd5e1;font-size:11px;text-align:center">© 2026 ${companyName} — SGD Dental Suite</p>
            </div>`
        });
    }
};

/**
 * Notifica al médico sobre una nueva cita asignada
 */
const notifyDoctorNewAppointment = async ({ doctor, patient, appointment, branchName }) => {
    const patientName = [patient?.firstName, patient?.paternalSurname].filter(Boolean).join(' ');
    const dateStr = formatDate(appointment.date);
    const title = '🗓️ Nueva Cita Asignada';
    const body = `Tienes una nueva cita con ${patientName} para el ${dateStr}.`;

    // 1. Enviar Push si tiene token
    if (doctor.fcmToken) {
        await sendPushNotification({
            token: doctor.fcmToken,
            title,
            body,
            data: { appointmentId: appointment.id.toString(), type: 'DOCTOR_NEW_APP' }
        });
    }

    // 2. Enviar Email
    if (doctor.email) {
        await sendEmail({
            to: doctor.email,
            subject: `🗓️ Nueva cita — ${patientName}`,
            html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:16px">
                <h2 style="color:#1e293b;margin-bottom:4px">Nueva cita agendada</h2>
                <div style="background:white;border-radius:12px;padding:20px;margin:20px 0;border-left:4px solid #6366f1">
                    <p style="margin:6px 0;font-size:14px"><strong>👤 Paciente:</strong> ${patientName}</p>
                    <p style="margin:6px 0;font-size:14px"><strong>📅 Fecha y hora:</strong> ${dateStr}</p>
                    <p style="margin:6px 0;font-size:14px"><strong>🏥 Sede:</strong> ${branchName}</p>
                </div>
            </div>`
        });
    }
};

/**
 * Notifica cancelación al paciente
 */
const notifyPatientCancellation = async ({ patient, appointment, companyName }) => {
    const dateStr = formatDate(appointment.date);
    const title = '❌ Cita Cancelada';
    const body = `Tu cita para el ${dateStr} ha sido cancelada.`;

    if (patient.fcmToken) {
        await sendPushNotification({
            token: patient.fcmToken,
            title,
            body,
            data: { type: 'CANCELLED_APPOINTMENT' }
        });
    }

    if (patient.email) {
        await sendEmail({
            to: patient.email,
            subject: title,
            html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#fff1f2;border-radius:16px">
                <h2 style="color:#e11d48;margin-bottom:4px">Tu cita ha sido cancelada</h2>
                <p style="color:#64748b;font-size:13px">La cita programada para <strong>${dateStr}</strong> fue cancelada.</p>
                <p style="color:#64748b;font-size:13px">Para reagendar, contacta a <strong>${companyName}</strong>.</p>
            </div>`
        });
    }
};

module.exports = {
    notifyPatientNewAppointment,
    notifyDoctorNewAppointment,
    notifyPatientCancellation
};
