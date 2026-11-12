import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// "Right of access": a signed-in user downloads a copy of THEIR data as JSON.
//
// Everything is read through the user's own session, so row level security
// applies on top of the explicit filters below, and the file only ever contains
// rows that belong to them. Fields that are internal or about other people
// (payment intent ids, other sellers' ids) are left out.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const [profile, addresses, orders, reviews, questions, wishlist, returns, applications, requests] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, phone, role, preferred_locale, preferred_currency")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("addresses")
        .select("label, recipient_name, phone, line1, line2, city, state, postal_code, country, type, is_default, created_at")
        .eq("user_id", user.id),
      supabase
        .from("orders")
        .select(
          "order_number, status, currency, subtotal_cents, shipping_cents, discount_cents, promo_code, total_cents, customer_email, shipping_address_snapshot, tracking_number, created_at, order_items(product_name_snapshot, variant_attrs_snapshot, unit_price_cents, quantity, shipped_at, tracking_number)"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("reviews")
        .select("rating, title, comment, is_verified_purchase, created_at, products(name)")
        .eq("user_id", user.id),
      supabase
        .from("product_questions")
        .select("question, answer, created_at, products(name)")
        .eq("user_id", user.id),
      supabase.from("wishlists").select("created_at, products(name)").eq("user_id", user.id),
      supabase
        .from("return_requests")
        .select(
          "reason, details, status, refund_amount_cents, currency, decision_note, created_at, return_messages(author_role, body, created_at)"
        )
        .eq("user_id", user.id),
      supabase
        .from("seller_applications")
        .select("business_name, description, phone, status, rejection_reason, created_at")
        .eq("user_id", user.id),
      supabase.from("data_requests").select("kind, status, admin_note, created_at, resolved_at").eq("user_id", user.id),
    ]);

  const failed = [profile, addresses, orders, reviews, questions, wishlist, returns, applications, requests].find(
    (result) => result.error
  );
  if (failed?.error) {
    console.error("Data export failed:", failed.error.message);
    return NextResponse.json({ error: "Could not build your export." }, { status: 500 });
  }

  const body = {
    exported_at: new Date().toISOString(),
    account: { email: user.email, created_at: user.created_at, ...profile.data },
    addresses: addresses.data,
    orders: orders.data,
    reviews: reviews.data,
    questions: questions.data,
    wishlist: wishlist.data,
    returns: returns.data,
    seller_applications: applications.data,
    data_requests: requests.data,
    note: "The identity document of a seller application is stored privately and is not included in this file.",
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="omnara-mis-datos.json"',
      "Cache-Control": "no-store",
    },
  });
}
