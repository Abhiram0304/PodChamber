const nodemailer = require("nodemailer")

interface MailTypes {
    email: string;
    title: string;
    body: string
}

const SendEmail = async({email,title,body}: MailTypes) => {
    try{
        const transporter = nodemailer.createTransport({
            pool:true,
            service : process.env.MAIL_HOST,
            auth:{
                user : process.env.MAIL_USER,
                pass : process.env.MAIL_PASS
            }
        });

        const mailOptions = {
            from : "PodChamber | Rendered Video Link",
            to:email,
            subject:title,
            html:body,
        }

        let info = await transporter.sendMail(mailOptions);

        transporter.close();

        return info;
    }catch(e){
        console.log("Error Sending Email");
        throw(e);
    }
}

module.exports = SendEmail;