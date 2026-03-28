import nodemailer from 'nodemailer';

// ✅ Enhanced email sending utility with error handling
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    // ✅ Validate required environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Email credentials not configured in environment variables');
    }

    // ✅ Create transporter with timeout settings
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      // ✅ Add timeout settings
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });

    // ✅ Verify transporter connection before sending
    await transporter.verify();

    // ✅ Email options with fallback plain text
    const mailOptions = {
      from: `"${process.env.APP_NAME || 'Auth App'}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // ✅ Fallback: strip HTML for plain text
    };

    // ✅ Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully:', info.messageId);
    return info;

  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

export default sendEmail;