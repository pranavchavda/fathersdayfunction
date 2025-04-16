import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  // Redirect to the dashboard view by default
  return redirect("/app/extensions/free-gift/dashboard");
}
