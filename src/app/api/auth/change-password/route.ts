import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const old_password = String(body.old_password ?? "");
    const new_password = String(body.new_password ?? "");

    if (!old_password || !new_password || new_password.length < 6) {
      return NextResponse.json(
        { error: "Old password and new password (min 6 characters) required" },
        { status: 400 }
      );
    }

    const r = await query(
      "SELECT password_hash FROM ships WHERE id = $1",
      [session.ship.id]
    );
    if (r.rows.length === 0) {
      return NextResponse.json({ error: "Ship not found" }, { status: 401 });
    }

    const match = await bcrypt.compare(old_password, r.rows[0].password_hash);
    if (!match) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await query("UPDATE ships SET password_hash = $1 WHERE id = $2", [
      password_hash,
      session.ship.id,
    ]);

    await query(
      "INSERT INTO password_change_log (ship_id, admin_notified) VALUES ($1, true)",
      [session.ship.id]
    );

    // Notify admin via email (optional). The DB log still records the change.
    try {
      const adminEmail = process.env.ADMIN_EMAIL;
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const from = process.env.SMTP_FROM ?? smtpUser ?? "no-reply@example.com";

      if (adminEmail && smtpHost && smtpUser && smtpPass) {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass },
        });

        const when = new Date().toLocaleString();
        await transporter.sendMail({
          from,
          to: adminEmail,
          subject: "Password changed",
          text: `Ship ${session.ship.name} (${session.ship.login_id}) changed password at ${when}.`,
        });
      } else {
        console.warn("[Sea Regent] Email not sent: set ADMIN_EMAIL and SMTP_* env vars.");
      }
    } catch (emailErr) {
      console.error("[Sea Regent] Failed to send admin email:", emailErr);
    }

    return NextResponse.json({
      success: true,
      message: "Password changed. Admin will be emailed (if email is configured).",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
