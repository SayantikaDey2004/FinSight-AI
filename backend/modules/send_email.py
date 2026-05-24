from __future__ import annotations

import os
import ssl
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Iterable


def _get_env(name: str, default: str | None = None) -> str:
    value = os.getenv(name, default)
    if value is None or not str(value).strip():
        raise RuntimeError(f"Missing required environment variable: {name}")
    return str(value).strip()


def send_email(
    *,
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str | None = None,
    from_email: str | None = None,
    cc: Iterable[str] | None = None,
    bcc: Iterable[str] | None = None,
) -> None:
    """Send email via Bravo SMTP.

    Expected env vars (can be set in backend/.env):
    - BRAVO_SMTP_HOST
    - BRAVO_SMTP_PORT
    - BRAVO_SMTP_USERNAME
    - BRAVO_SMTP_PASSWORD
    - BRAVO_FROM_EMAIL (or pass from_email=...)

    Notes:
    - Uses STARTTLS when available.
    - Raises RuntimeError on configuration/sending failures.
    """

    smtp_host = _get_env("BRAVO_SMTP_HOST")
    smtp_port = int(_get_env("BRAVO_SMTP_PORT", "587"))
    smtp_user = _get_env("BRAVO_SMTP_USERNAME")
    smtp_pass = _get_env("BRAVO_SMTP_PASSWORD")

    from_addr = from_email or os.getenv("BRAVO_FROM_EMAIL")
    if not from_addr:
        raise RuntimeError("Missing from email. Set BRAVO_FROM_EMAIL or pass from_email.")

    cc_list = list(cc) if cc else []
    bcc_list = list(bcc) if bcc else []

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_email
    if cc_list:
        msg["Cc"] = ", ".join(cc_list)

    if text_body is None:
        text_body = "You requested a password reset. Please open the link to set a new password."

    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    recipients = [to_email, *cc_list, *bcc_list]

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
            server.ehlo()
            # STARTTLS when supported
            try:
                server.starttls(context=context)
                server.ehlo()
            except smtplib.SMTPException:
                # If STARTTLS isn't supported, proceed (may still work in SSL setups)
                pass

            server.login(smtp_user, smtp_pass)
            server.sendmail(from_addr, recipients, msg.as_string())
    except Exception as exc:
        raise RuntimeError(f"Failed to send email via Bravo SMTP: {exc}") from exc

