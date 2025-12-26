const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
        },
    });

    const mailOptions = {
        // লজিক ঠিক রেখে শুধু একটি ডিফল্ট ভ্যালু যোগ করা হয়েছে যাতে APP_NAME না থাকলে সমস্যা না হয়
        from: `"${process.env.APP_NAME || "Girl's Fashion"}" <${process.env.SMTP_EMAIL}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
    };

    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;