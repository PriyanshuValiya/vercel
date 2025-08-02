import dotenv from "dotenv";
dotenv.config();

import { Resend } from "resend";
import supabase from "./supabase";

if (!process.env.RESEND_API_KEY) {
  throw new Error("Missing Resend API Key !!");
}

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendDeploymentMail = async ({
  userId,
  projectName,
  deployedUrl,
  framework,
  deploymentTime,
}: {
  userId: string;
  projectName: string;
  deployedUrl: string;
  framework: string;
  deploymentTime: string;
}) => {
  try {
    const { data: userData, error: errorUserData } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (errorUserData) {
        throw new Error("Can't find User to mail !!");
    }

    const { data, error } = await resend.emails.send({
      from: "vercel@priyanshuvaliya.me",
      to: userData.email,
      subject: `${projectName} Deployed Successfully `,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <div style="background: #00b894; color: white; padding: 20px;">
              <h2>Deployment Successful!</h2>
            </div>
            <div style="padding: 20px;">
              <p>Hi there,</p>
              <p>Your project <strong>${projectName}</strong> has been successfully deployed 🎉</p>

              <h3 style="margin-top: 20px;">Project Summary:</h3>
              <ul style="line-height: 1.8;">
                <li><strong>Framework:</strong> ${framework}</li>
                <li><strong>Deployed At:</strong> ${deploymentTime}</li>
                <li><strong>Live URL:</strong> <a href="${deployedUrl}" target="_blank">${deployedUrl}</a></li>
              </ul>

              <p style="margin-top: 30px;">Thank you for using our deployment service.</p>
              <p>– The Vercel Clone Team</p>
            </div>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Failed to send email:", error);
    }

    return { success: true, message: "Email sent successfully." };
  } catch (err) {
    console.error("Error sending deployment email:", err);
    return { success: false, error: err };
  }
};
