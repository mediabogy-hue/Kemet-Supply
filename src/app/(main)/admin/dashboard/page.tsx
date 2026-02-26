
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>Admin Area</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This is the new admin dashboard. The project has been reset.</p>
        </CardContent>
      </Card>
    </div>
  );
}
