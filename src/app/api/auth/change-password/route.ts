import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import nodemailer from "nodemailer";
import { loginIdToSupabaseEmail, supabaseAuthConfigured } from "@/lib/ship-auth-email";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.sessionId === "demo") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!supabaseAuthConfigured()) {
      return NextResponse.json({ error: "Supabase Auth is not configured." }, { status: 503 });
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

    const rowCheck = await query(`SELECT auth_user_id FROM ships WHERE id = $1`, [
      session.ship.id,
    ]);
    if (rowCheck.rows.length === 0 || !rowCheck.rows[0].auth_user_id) {
      return NextResponse.json({ error: "Ship not linked to Supabase Auth" }, { status: 400 });
    }

    const response = NextResponse.json({
      success: true,
      message: "Password changed. Admin will be emailed (if email is configured).",
    });

    const supabase = createSupabaseRouteHandlerClient(response);
    const email = loginIdToSupabaseEmail(session.ship.login_id);

    const { error: signErr } = await supabase.auth.signInWithPassword({
      email,
      password: old_password,
    });
    if (signErr) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    const { error: updErr } = await supabase.auth.updateUser({ password: new_password });
    if (updErr) {
      console.error("[change-password]", updErr);
      return NextResponse.json({ error: "Failed to update password" }, { status: 400 });
    }

    await query(`INSERT INTO password_change_log (ship_id, admin_notified) VALUES ($1, true)`, [
      session.ship.id,
    ]);

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

    return response;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
