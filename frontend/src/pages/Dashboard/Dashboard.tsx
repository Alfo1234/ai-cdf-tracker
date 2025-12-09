import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const categoryData = [
  { category: "Education", value: 35 },
  { category: "Water", value: 20 },
  { category: "Health", value: 18 },
  { category: "Infrastructure", value: 40 },
];

const spendingData = [
  { month: "Jan", value: 300000 },
  { month: "Feb", value: 450000 },
  { month: "Mar", value: 380000 },
  { month: "Apr", value: 500000 },
  { month: "May", value: 620000 },
  { month: "Jun", value: 540000 },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard label="Total Projects" value="128" />
        <StatCard label="Completed" value="64" />
        <StatCard label="Ongoing" value="42" />
        <StatCard label="Irregularities Flagged" value="22" highlight />
      </div>

      {/* Table */}
      <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-2xl shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-semibold">Latest Projects</h2>
          <p className="text-xs text-slate-500">
            Sample data – will be replaced with live CDF feeds
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="p-4 text-left">Project Name</th>
                <th className="p-4 text-left">Category</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Budget</th>
                <th className="p-4 text-left">Progress</th>
              </tr>
            </thead>
            <tbody>
              <TableRow
                name="New Classroom Block"
                category="Education"
                status="Completed"
                statusColor="green"
                budget="KSh 2,400,000"
                progress="100%"
              />
              <TableRow
                name="Borehole Drilling"
                category="Water"
                status="Ongoing"
                statusColor="yellow"
                budget="KSh 1,750,000"
                progress="65%"
              />
              <TableRow
                name="Road Grading"
                category="Infrastructure"
                status="Flagged"
                statusColor="red"
                budget="KSh 3,100,000"
                progress="82%"
              />
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Bar chart */}
        <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-2xl shadow-sm p-6">
          <h2 className="text-base font-semibold mb-4">Projects by Category</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="category" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar
                dataKey="value"
                fill="url(#categoryGradient)"
                radius={[8, 8, 0, 0]}
              />
              <defs>
                <linearGradient id="categoryGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line chart */}
        <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-2xl shadow-sm p-6">
          <h2 className="text-base font-semibold mb-4">
            Monthly Spending Trend
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={spendingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#0ea5e9"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: "white" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* --- Small reusable components --- */

type StatCardProps = {
  label: string;
  value: string;
  highlight?: boolean;
};

function StatCard({ label, value, highlight }: StatCardProps) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-2xl border shadow-sm p-5",
        "bg-white/80 backdrop-blur border-slate-200",
      ].join(" ")}
    >
      {/* subtle gradient stripe */}
      <div className="absolute inset-x-0 -top-6 h-16 bg-gradient-to-r from-sky-400/20 via-blue-500/10 to-emerald-400/20 pointer-events-none" />
      <div className="relative">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <h2
          className={[
            "mt-2 text-3xl font-semibold",
            highlight ? "text-red-600" : "text-slate-900",
          ].join(" ")}
        >
          {value}
        </h2>
      </div>
    </div>
  );
}

type TableRowProps = {
  name: string;
  category: string;
  status: string;
  statusColor: "green" | "yellow" | "red";
  budget: string;
  progress: string;
};

function TableRow({
  name,
  category,
  status,
  statusColor,
  budget,
  progress,
}: TableRowProps) {
  const colorMap: Record<
    TableRowProps["statusColor"],
    { bg: string; text: string }
  > = {
    green: { bg: "bg-green-100", text: "text-green-700" },
    yellow: { bg: "bg-yellow-100", text: "text-yellow-700" },
    red: { bg: "bg-red-100", text: "text-red-700" },
  };

  const color = colorMap[statusColor];

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/80">
      <td className="p-4">{name}</td>
      <td className="p-4 text-slate-600">{category}</td>
      <td className="p-4">
        <span
          className={[
            "px-3 py-1 rounded-full text-xs font-medium",
            color.bg,
            color.text,
          ].join(" ")}
        >
          {status}
        </span>
      </td>
      <td className="p-4">{budget}</td>
      <td className="p-4 text-slate-700">{progress}</td>
    </tr>
  );
}
