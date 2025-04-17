import { redirect } from "@remix-run/node";

export async function loader({ request }) {
  // No need for authentication for redirection
  return redirect("/app/extensions/free-gift/dashboard");
}
