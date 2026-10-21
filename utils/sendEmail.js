module.exports = async ({ to, name, subject, html }) => {
  if (!process.env.BREVO_API_KEY) {
    console.log(`[DEV EMAIL] to ${to}: ${subject}\n${html.replace(/<[^>]+>/g, " ")}`);
    return;
  }
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: process.env.BREVO_SENDER_NAME || "ChatApp", email: process.env.BREVO_SENDER_EMAIL },
      to: [{ email: to, name }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    console.error("Brevo error:", res.status, await res.text());
    throw new Error("Could not send the email. Please try again.");
  }
};