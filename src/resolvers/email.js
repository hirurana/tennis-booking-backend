exports.uniqueLinkEmail = (prompt, email, link) => {
    return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
  <html xmlns="http://www.w3.org/1999/xhtml">

  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>${prompt}</title>
    <style type="text/css">
    body {margin: 0; padding: 0; min-width: 100%!important;}
    img {height: auto;}
    .content {width: 100%; max-width: 600px;}
    .header {padding: 40px 30px 20px 30px;}
    .innerpadding {padding: 30px 30px 30px 30px;}
    .borderbottom {border-bottom: 1px solid #f2eeed;}
    .subhead {font-size: 15px; color: #ffffff; font-family: sans-serif; letter-spacing: 10px;}
    .h1, .h2, .bodycopy {color: #153643; font-family: sans-serif;}
    .h1 {color: #ffffff; font-size: 33px; line-height: 38px; font-weight: bold;}
    .h2 {padding: 0 0 15px 0; font-size: 24px; line-height: 28px; font-weight: bold;}
    .bodycopy {font-size: 16px; line-height: 22px;}
    .button {text-align: center; font-size: 18px; font-family: sans-serif; font-weight: bold; padding: 0 30px 0 30px;}
    .button a {color: #ffffff; text-decoration: none;}
    .footer {padding: 20px 30px 15px 30px;}
    .footercopy {font-family: sans-serif; font-size: 14px; color: #ffffff;}
    .footercopy a {color: #ffffff; text-decoration: underline;}

    @media only screen and (max-width: 550px), screen and (max-device-width: 550px) {
    body[yahoo] .hide {display: none!important;}
    body[yahoo] .buttonwrapper {background-color: transparent!important;}
    body[yahoo] .button {padding: 0px!important;}
    body[yahoo] .button a {background-color: #e05443; padding: 15px 15px 13px!important;}
    }

    </style>
  </head>

  <body yahoo bgcolor="#f5f5f7">
  <table width="100%" bgcolor="#f5f5f7" border="0" cellpadding="0" cellspacing="0">
  <tr>
    <td>
      <table bgcolor="#ffffff" class="content" align="center" cellpadding="0" cellspacing="0" border="0" >
        <tr>
          <td bgcolor="#082244" class="header">
            <table width="70" align="left" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td height="70" style="padding: 0 20px 20px 0;">
                  <!-- <img class="fix" src="" width="70" height="70" border="0" alt="" /> -->
                </td>
              </tr>
            </table>
            <table class="col425" align="left" border="0" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 425px;">
              <tr>
                <td height="70">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td class="subhead" style="padding: 0 0 0 3px;">
                        UCL TENNIS SOCIETY
                      </td>
                    </tr>
                    <tr>
                      <td class="h1" style="padding: 5px 0 0 0;">
                        ${prompt}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td class="innerpadding borderbottom">
            <table class="col380" align="center" border="0" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 380px;">
              <tr>
                <td>
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td class="bodycopy">
                        Dear ${email.substr(
                            0,
                            email.indexOf('@'),
                        )}, <br><br> Click below to ${prompt.toLowerCase()}:
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 20px 0 0 0;">
                        <table align="center" class="buttonwrapper" bgcolor="#e05443" border="0" cellspacing="0" cellpadding="0" >
                          <tr>
                            <td class="button" height="45">
                              <a href="${link}">${prompt.substr(
        0,
        prompt.indexOf(' '),
    )}</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td class="footer" bgcolor="#44525f">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" class="footercopy">
                  &reg; UCL Tennis Society 2020<br/>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding: 20px 0 0 0;">
                  <table border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td width="37" style="text-align: center; padding: 0 10px 0 10px;">
                        <a href="http://www.facebook.com/ucltennis">
                          <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/210284/facebook.png" width="37" height="37" alt="Facebook" border="0" />
                        </a>
                      </td>

                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
  </body>
  </html>
`
}
