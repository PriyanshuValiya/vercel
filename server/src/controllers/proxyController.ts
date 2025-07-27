import dotenv from "dotenv";
dotenv.config();

import { Request, Response } from "express";
import supabase from "../utils/supabase";

const BASE_URL = process.env.BASE_URL!;
const DOMAIN_URL  = process.env.DOMAIN_URL!;

if (!BASE_URL || !DOMAIN_URL) {
  throw new Error("Missing Domain URL OR Base URL in server !!");
}

export const proxyController = async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("projects")
    .select("port, framework")
    .eq("id", id)
    .single();

  if (error) {
    res.status(500).json({
      message: "Error fetching project data",
      error: error.message,
    });
  }

  if (data?.framework == "Node") {
    res.redirect(`${DOMAIN_URL}:${data?.port}`);
  } else {
    res.redirect(`${BASE_URL}/${id}/index.html`);
  }

  res.status(200).json({
    message: "Proxy controller ran successfully",
  });
};
