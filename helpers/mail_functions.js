const {
    mailer
} = require('../config')

// Set MOCK_OTP=false in .env to actually send emails (uses MAIL_* config).
// Default (unset/true) keeps emails mocked so existing flows are unchanged.
const isMailMocked = () => String(process.env.MOCK_OTP || 'true').toLowerCase() !== 'false';



const sendHtmlMailToSingleReceiver = async (receiver_mail, receiver_name, sender_mail, sender_name, subject, html, attachments = null) => {
    if (isMailMocked()) {
        console.log('MOCK_OTP is enabled. Email sending is skipped.');
        return;
    }
    let mailer_body = {
        from: `"${sender_name}" <${sender_mail}>`,
        to: `"${receiver_name}" <${receiver_mail}>`,
        subject,
        html
    }
    if (attachments) {
        mailer_body.attachments = attachments
    }
    const info = await mailer.sendMail(mailer_body)
    console.log('mail_functions.js @ Line 18:', info.messageId);
}
const sendTextMailToSingleReceiver = async (receiver_mail, receiver_name, sender_mail, sender_name, subject, text, attachments = null) => {
    if (isMailMocked()) {
        console.log('MOCK_OTP is enabled. Email sending is skipped.');
        return;
    }
    let mailer_body = {
        from: `"${sender_name}" <${sender_mail}>`,
        to: `"${receiver_name}" <${receiver_mail}>`,
        subject,
        text
    }
    if (attachments) {
        mailer_body.attachments = attachments
    }
    const info = await mailer.sendMail(mailer_body)
    console.log('mail_functions.js @ Line 31:', info.messageId);
}
const sendHtmlMailToMultiReceiver = async (receiver_list, sender_mail, sender_name, subject, html, attachments = null) => {
    if (isMailMocked()) {
        console.log('MOCK_OTP is enabled. Email sending is skipped.');
        return;
    }
    let mailer_body = {
        from: `"${sender_name}" <${sender_mail}>`,
        to: receiver_list,
        subject,
        html
    }
    if (attachments) {
        mailer_body.attachments = attachments
    }
    const info = await mailer.sendMail(mailer_body)
    console.log('mail_functions.js @ Line 18:', info.messageId);
}
const sendTextMailToMultiReceiver = async (receiver_list, sender_mail, sender_name, subject, text, attachments = null) => {
    if (isMailMocked()) {
        console.log('MOCK_OTP is enabled. Email sending is skipped.');
        return;
    }
    let mailer_body = {
        from: `"${sender_name}" <${sender_mail}>`,
        to: receiver_list,
        subject,
        text
    }
    if (attachments) {
        mailer_body.attachments = attachments
    }
    const info = await mailer.sendMail(mailer_body)
    console.log('mail_functions.js @ Line 31:', info.messageId);
}



module.exports = {
    sendHtmlMailToSingleReceiver,
    sendTextMailToSingleReceiver,
    sendHtmlMailToMultiReceiver,
    sendTextMailToMultiReceiver
}