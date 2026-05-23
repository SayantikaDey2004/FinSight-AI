from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from app.config.settings import settings

# Build the email connection config from our settings
mail_config = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    USE_CREDENTIALS=True,
)

fast_mail = FastMail(mail_config)


async def send_password_reset_email(email: str, name: str, token: str):
    """
    Sends a password reset link to the user's email.
    The link points to your frontend's reset-password page,
    which will then call POST /auth/reset-password with the token.
    """
    reset_link = f"{settings.CLIENT_URL}/reset-password?token={token}"

    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2>Password Reset Request</h2>
        <p>Hi <strong>{name}</strong>,</p>
        <p>We received a request to reset your password for your FinSight account.</p>
        <p>Click the button below to reset it. This link is valid for
           <strong>{settings.RESET_TOKEN_EXPIRE_MINUTES} minutes</strong>.</p>
        <a href="{reset_link}"
           style="display:inline-block; padding:12px 24px; background:#4F46E5;
                  color:white; text-decoration:none; border-radius:6px; margin:16px 0;">
          Reset Password
        </a>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <hr/>
        <small>FinSight — AI-Powered Finance Analysis</small>
      </body>
    </html>
    """

    message = MessageSchema(
        subject="Reset Your FinSight Password",
        recipients=[email],
        body=html_body,
        subtype=MessageType.html,
    )

    await fast_mail.send_message(message)


async def send_welcome_email(email: str, name: str):
    """Optional: Send a welcome email on signup."""
    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2>Welcome to FinSight! 🎉</h2>
        <p>Hi <strong>{name}</strong>,</p>
        <p>Your account has been created successfully.</p>
        <p>You can now upload your bank statements and get AI-powered financial insights.</p>
        <a href="{settings.CLIENT_URL}/login"
           style="display:inline-block; padding:12px 24px; background:#4F46E5;
                  color:white; text-decoration:none; border-radius:6px; margin:16px 0;">
          Login to FinSight
        </a>
        <hr/>
        <small>FinSight — AI-Powered Finance Analysis</small>
      </body>
    </html>
    """

    message = MessageSchema(
        subject="Welcome to FinSight!",
        recipients=[email],
        body=html_body,
        subtype=MessageType.html,
    )

    await fast_mail.send_message(message)
