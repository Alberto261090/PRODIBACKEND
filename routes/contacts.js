import { Router } from 'express';
import { Resend } from 'resend';

const router = Router();

const resend = new Resend(process.env.RESEND_API_KEY);

// ── Helper: construye el HTML del correo ─────────────────────────────────────
function buildHtml(c) {
  const esc = (s) => String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  return `
<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background:#001F3F;color:#fff;padding:24px;">
            <h1 style="margin:0;font-size:18px;font-weight:600;">Nuevo contacto desde el sitio</h1>
            <p style="margin:6px 0 0;font-size:13px;color:#cbd5e1;">PRODI Ingeniería Farmacéutica</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.6;">
              <tr><td style="padding:6px 0;color:#6b7280;width:160px;">Nombre</td>
                  <td style="padding:6px 0;font-weight:600;">${esc(c.nombre)}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280;">Empresa</td>
                  <td style="padding:6px 0;font-weight:600;">${esc(c.empresa)}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280;">Email</td>
                  <td style="padding:6px 0;">
                    <a href="mailto:${esc(c.email)}" style="color:#0070b3;">${esc(c.email)}</a>
                  </td></tr>
              <tr><td style="padding:6px 0;color:#6b7280;">Teléfono</td>
                  <td style="padding:6px 0;">
                    <a href="tel:${esc(c.telefono)}" style="color:#0070b3;">${esc(c.telefono)}</a>
                  </td></tr>
              <tr><td style="padding:6px 0;color:#6b7280;">Sector</td>
                  <td style="padding:6px 0;">${esc(c.sector)}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280;">Tipo de proyecto</td>
                  <td style="padding:6px 0;">${esc(c.tipo_proyecto)}</td></tr>
            </table>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;"/>
            <p style="margin:0 0 8px;color:#6b7280;font-size:13px;text-transform:uppercase;
                      letter-spacing:0.05em;font-weight:600;">Mensaje</p>
            <div style="padding:16px;background:#f9fafb;border-left:3px solid #001F3F;
                        border-radius:4px;font-size:14px;line-height:1.6;color:#1f2937;">
              ${esc(c.mensaje).replace(/\n/g, '<br/>') || '<em style="color:#9ca3af;">(sin mensaje)</em>'}
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;
                     font-size:12px;color:#6b7280;">
            Recibido el ${new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── POST /api/contacts ────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { nombre, empresa, email, telefono, sector, tipo_proyecto, mensaje } = req.body || {};

    // Validación básica
    const required = { nombre, empresa, email, telefono, sector, tipo_proyecto };
    const missing  = Object.entries(required).filter(([, v]) => !v).map(([k]) => k);
    if (missing.length) {
      return res.status(400).json({
        ok: false,
        error: `Campos requeridos faltantes: ${missing.join(', ')}`,
      });
    }

    if (!process.env.RESEND_API_KEY) {
      console.warn('[contacts] RESEND_API_KEY no configurada.');
      return res.status(503).json({ ok: false, error: 'Servicio de correo no configurado.' });
    }

    const recipient  = process.env.CONTACT_RECIPIENT  || 'administracion@prodi.mx';
    const cc         = process.env.CONTACT_CC;
    const senderName = process.env.CONTACT_SENDER_NAME || 'Sitio PRODI';
    const fromEmail  = `${senderName} <onboarding@resend.dev>`;

    const data = { nombre, empresa, email, telefono, sector, tipo_proyecto, mensaje: mensaje || '' };

    const { error } = await resend.emails.send({
      from:    fromEmail,
      to:      [recipient],
      cc:      cc ? cc.split(',').map(e => e.trim()) : undefined,
      replyTo: email,
      subject: `Nuevo contacto: ${empresa || nombre}`,
      html:    buildHtml(data),
    });

    if (error) {
      console.error('[contacts] ERROR Resend:', error);
      return res.status(500).json({ ok: false, error: 'Error al enviar el correo.' });
    }

    console.log(`[contacts] ✓ Correo enviado → ${recipient}`);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[contacts] ERROR al enviar correo:', err?.message ?? err);
    res.status(500).json({ ok: false, error: 'Error al enviar el correo. Intente de nuevo.' });
  }
});

export default router;
