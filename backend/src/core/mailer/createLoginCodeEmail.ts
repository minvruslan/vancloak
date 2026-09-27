import { AppLogoPngBase64 } from "./constants/index.js"

const BRAND_COLOR = "#1b55f5"
const LOGO_CONTENT_ID = "vancloak-logo"

export function createLoginCodeEmail(code: string): {
  subject: string
  text: string
  html: string
  attachments: { filename: string; content: Buffer; cid: string; contentType: string }[]
} {
  return {
    subject: "Вход в VanCloak",
    text: [
      `Ваш код для входа: ${code}`,
      "",
      "Код действует 5 минут.",
      "",
      "Если вы не запрашивали это письмо, просто проигнорируйте его.",
    ].join("\n"),
    html: `<body style="margin:0;padding:0;background-color:#f6f7f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f7f9;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;">
          <tr>
            <td style="background-color:#ffffff;border:1px solid #e4e4e7;border-radius:12px;padding:40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <img src="cid:${LOGO_CONTENT_ID}" width="56" height="56" alt="VanCloak" style="display:block;border:0;border-radius:12px;" />
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;line-height:28px;font-weight:600;color:#18181b;padding-bottom:12px;">
                    Вход в VanCloak
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:23px;color:#52525b;padding-bottom:28px;">
                    Введите код ниже, чтобы завершить вход. Код действует 5 минут.
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="background-color:#f6f7f9;border-radius:8px;">
                          <span style="display:inline-block;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:28px;font-weight:600;line-height:36px;letter-spacing:8px;color:${BRAND_COLOR};padding:13px 32px 13px 40px;">${code}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;color:#a1a1aa;padding-top:24px;">
              Если вы не запрашивали это письмо, просто проигнорируйте его.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>`,
    attachments: [
      {
        filename: "vancloak.png",
        content: Buffer.from(AppLogoPngBase64, "base64"),
        cid: LOGO_CONTENT_ID,
        contentType: "image/png",
      },
    ],
  }
}
