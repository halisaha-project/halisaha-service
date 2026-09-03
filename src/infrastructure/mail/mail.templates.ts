function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function layout(appName: string, heading: string, body: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
    <h1 style="font-size: 20px;">${escapeHtml(heading)}</h1>
    ${body}
    <p style="color: #6b7280;">${escapeHtml(appName)}</p>
  </body>
</html>`;
}

function tokenParagraph(token: string): string {
  return `<p><strong>Token:</strong> <code>${escapeHtml(token)}</code></p>`;
}

export function emailVerificationTemplate(
  appName: string,
  token: string,
): string {
  return layout(
    appName,
    'Verify your email',
    `<p>Use the token below to verify your email address.</p>${tokenParagraph(token)}<p>This token expires in 24 hours.</p>`,
  );
}

export function passwordResetTemplate(appName: string, token: string): string {
  return layout(
    appName,
    'Reset your password',
    `<p>Use the token below to reset your password.</p>${tokenParagraph(token)}<p>This token expires in 1 hour. If you did not request this, you can ignore this email.</p>`,
  );
}

export function groupInvitationTemplate(
  appName: string,
  groupName: string,
  token: string,
): string {
  return layout(
    appName,
    'Group invitation',
    `<p>You have been invited to join <strong>${escapeHtml(groupName)}</strong>.</p>${tokenParagraph(token)}<p>This invitation expires in 7 days.</p>`,
  );
}
