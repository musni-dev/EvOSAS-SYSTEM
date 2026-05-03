import { SectionHeader } from "../components/SectionHeader";
import { Badge } from "../components/Badge";
import { mockDisciplinary } from "../data/mockData";

export default function DisciplinaryPage() {
  return (
    <div>
      <SectionHeader title="Disciplinary Cases" action="New Case" />

      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>Case ID</th>
              <th>Student</th>
              <th>Offense</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {mockDisciplinary.map((d) => (
              <tr key={d.id}>
                <td>{d.id}</td>
                <td>{d.student}</td>
                <td>{d.case}</td>
                <td><Badge status={d.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}