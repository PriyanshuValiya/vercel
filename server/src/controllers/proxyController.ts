import { Request, Response } from "express";
import supabase from "../utils/supabase";

export const proxyController = async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("projects")
    .select("port")
    .eq("id", id)
    .single();

  if (error) {
    res.status(500).json({
      message: "Error fetching project data",
      error: error.message,
    });
  }

  res.redirect(`http://vercel.priyanshuvaliya.me:${data?.port}`);

  res.status(200).json({
    message: "Proxy controller hit",
    data,
  });
};
