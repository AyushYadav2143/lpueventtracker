import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface SubmitEventRequest {
  title: string;
  description: string;
  organizer: string;
  category: string;
  start_date: string; // ISO or datetime-local
  end_date?: string | null;
  event_link?: string | null;
  location_lat: number;
  location_lng: number;
  poster_url?: string | null;
  image_urls?: string[];
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: SubmitEventRequest = await req.json();

    // Basic validation and normalization
    const required = [
      payload.title,
      payload.description,
      payload.organizer,
      payload.category,
      payload.start_date,
    ];
    if (required.some((v) => !v || String(v).trim() === "")) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const startDate = new Date(payload.start_date);
    const endDate = payload.end_date && String(payload.end_date).trim() !== ""
      ? new Date(payload.end_date)
      : startDate;

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return new Response(
        JSON.stringify({ error: "Invalid date format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const insertPayload = {
      title: String(payload.title).trim(),
      description: String(payload.description).trim(),
      organizer: String(payload.organizer).trim(),
      category: String(payload.category).trim(),
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      event_link: payload.event_link && payload.event_link.trim() !== "" ? payload.event_link.trim() : null,
      location_lat: Number(payload.location_lat),
      location_lng: Number(payload.location_lng),
      poster_url: payload.poster_url ?? null,
      image_urls: Array.isArray(payload.image_urls) ? payload.image_urls.filter((u) => typeof u === "string" && u.trim() !== "") : [],
      created_by: null, // No Supabase auth required; allow null
      status: "pending", // Always pending for admin review
    };

    const { data, error } = await supabase.from("events").insert([insertPayload]).select("id").maybeSingle();

    if (error) {
      console.error("submit-event insert error", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: data?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (err: any) {
    console.error("submit-event handler error", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
});
