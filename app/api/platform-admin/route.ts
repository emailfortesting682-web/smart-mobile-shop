import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/adminSupabase";

type AdminAction =
  | { type: "list" }
  | { type: "setOwnerStatus"; ownerId: string; status: "active" | "suspended" }
  | { type: "setWorkerStatus"; userId: string; status: "active" | "suspended" }
  | { type: "deleteWorker"; userId: string }
  | { type: "deleteOwner"; ownerId: string; deleteAuthUsers?: boolean };

function isAllowed(secret: string | null) {
  return Boolean(process.env.ADMIN_SECRET && secret && secret === process.env.ADMIN_SECRET);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as (AdminAction & { secret?: string }) | null;
  if (!body || !isAllowed(body.secret ?? null)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getAdminSupabase();

    if (body.type === "list") {
      const [ownersResult, profilesResult, shopsResult] = await Promise.all([
        supabase.from("owners").select("id,name,email,status,created_at").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id,owner_id,shop_id,role,name,email,status,created_at").order("created_at", { ascending: false }),
        supabase.from("shops").select("id,owner_id,name,city,created_at").order("created_at", { ascending: false })
      ]);

      const firstError = ownersResult.error ?? profilesResult.error ?? shopsResult.error;
      if (firstError) throw firstError;

      const profiles = profilesResult.data ?? [];
      const shops = shopsResult.data ?? [];
      const owners = (ownersResult.data ?? []).map((owner) => {
        const ownerProfiles = profiles.filter((profile) => profile.owner_id === owner.id);
        return {
          ...owner,
          workerCount: ownerProfiles.filter((profile) => profile.role === "shopkeeper").length,
          shopCount: shops.filter((shop) => shop.owner_id === owner.id).length,
          workers: ownerProfiles.filter((profile) => profile.role === "shopkeeper"),
          shops: shops.filter((shop) => shop.owner_id === owner.id)
        };
      });

      return NextResponse.json({
        totalOwners: owners.length,
        totalWorkers: profiles.filter((profile) => profile.role === "shopkeeper").length,
        owners
      });
    }

    if (body.type === "setOwnerStatus") {
      const { error: ownerError } = await supabase.from("owners").update({ status: body.status }).eq("id", body.ownerId);
      if (ownerError) throw ownerError;
      const { error: profileError } = await supabase.from("profiles").update({ status: body.status }).eq("owner_id", body.ownerId);
      if (profileError) throw profileError;
      return NextResponse.json({ ok: true });
    }

    if (body.type === "setWorkerStatus") {
      const { error } = await supabase.from("profiles").update({ status: body.status }).eq("id", body.userId).eq("role", "shopkeeper");
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (body.type === "deleteWorker") {
      const { error } = await supabase.auth.admin.deleteUser(body.userId);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (body.type === "deleteOwner") {
      const { data: profiles, error: profilesError } = await supabase.from("profiles").select("id").eq("owner_id", body.ownerId);
      if (profilesError) throw profilesError;

      const { error: ownerError } = await supabase.from("owners").delete().eq("id", body.ownerId);
      if (ownerError) throw ownerError;

      if (body.deleteAuthUsers) {
        for (const profile of profiles ?? []) {
          await supabase.auth.admin.deleteUser(profile.id);
        }
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown admin action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Admin action failed" },
      { status: 500 }
    );
  }
}
