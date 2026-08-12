import React from "react";
import dctLogo from "../../assets/dct-logo.png";
import osasLogo from "../../assets/osas-logo.png";


const getProgramAbbrev = (program) => {
  if (!program) return "";
  const match = program.match(/\(([^)]+)\)/);
  return match ? match[1] : program;
};

// Formats a "YYYY-MM-DD" (or any parseable) date string into
// "Month Day, Year" for display on the printed notice.
const formatNiceDate = (dateStr) => {
  if (!dateStr) return "__________________";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export default function Printablenotice({
  caseData,
  investigationDateTime,
  responseDays, // e.g. "3 working days" — optional, blank line shown if omitted
  coordinatorName = "Mr. Renel L. Samson",
  headName = "Mr. Jan Hanz S. Huet",
}) {
  if (!caseData) return null;

  const printDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const programLine = [
    getProgramAbbrev(caseData.program),
    caseData.yearLevel,
    caseData.section,
  ]
    .filter(Boolean)
    .join(" - ");

  return (
    <div className="notice-print-root">
      {/* Page setup + print isolation live with the component so they travel
          with it wherever PrintableNotice is used. */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 20mm;
          }

          html, body {
            height: auto !important;
            overflow: visible !important;
          }


          body * {
            display: none !important;
            visibility: hidden !important;
          }

          /* Restore any wrapper/parent element that contains the notice
             (e.g. the hidden "print-only" container in DisciplinaryPage.jsx) */
          body *:has(.notice-print-root) {
            display: block !important;
            visibility: visible !important;
          }

          .notice-print-root,
          .notice-print-root * {
            visibility: visible !important;
          }
          .notice-print-root { display: block !important; }
          .notice-print-root div { display: block !important; }
          .notice-print-root p { display: block !important; }
          .notice-print-root span { display: inline !important; }
          .notice-print-root strong,
          .notice-print-root b { display: inline !important; }
          .notice-print-root img { display: inline-block !important; }
          .notice-print-root ol { display: block !important; }
          .notice-print-root li { display: list-item !important; }

          /* The blanket ".notice-print-root div { display: block }" rule
             above also flattens the two flex rows (header logos row and
             the memo-box label/value rows), which is what was pushing the
             OSAS logo below the text instead of beside it. These two
             selectors are more specific (class + tag vs. just tag) so
             they win over the generic rule regardless of source order,
             restoring the flex layout for just these two containers. */
          .notice-print-root .notice-header-row,
          .notice-print-root .notice-memo-row {
            display: flex !important;
          }

          .notice-print-root {
            position: fixed !important;
            inset: 0 !important;
            width: 100% !important;
            background: #fff !important;
            z-index: 2147483647 !important;
          }

          /* Tighten vertical spacing in print only, so the whole notice
             fits on a single A4 page instead of spilling onto a 2nd
             sheet. Screen preview keeps the more spacious values above. */
          .notice-print-root { font-size: 10.5pt !important; line-height: 1.32 !important; }
          .notice-print-root p { margin: 0 0 5pt 0 !important; }

          .notice-watermark {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            /* Negative z-index still paints above this element's own
               white background (layer below in-flow content in the
               stacking order), but below all normal in-flow text and
               the memo box — so it sits as a true background watermark
               instead of overlapping on top of the title/memo box. */
            z-index: -1 !important;
          }
        }

        .notice-print-root {
          font-family: "Times New Roman", Times, serif;
          color: #000;
          background: #fff;
          max-width: 180mm;
          margin: 0 auto;
          line-height: 1.5;
          font-size: 12pt;
          position: relative;
        }
        .notice-print-root p {
          margin: 0 0 8pt 0;
        }
        .notice-watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-family: Calibri, sans-serif;
          font-weight: bold;
          font-size: 52pt;
          color: silver;
          opacity: 0.5;
          white-space: nowrap;
          pointer-events: none;
          z-index: 0;
        }
        .notice-header-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16pt;
          margin-bottom: 4pt;
        }
        .notice-header-rule {
          border-top: 2px solid #000;
          border-bottom: 1px solid #000;
          height: 3px;
          margin: 4pt 0 10pt;
        }
        .notice-memo-box {
          border: 1px solid #000;
          width: 260px;
          font-size: 10.5pt;
        }
        .notice-memo-title {
          text-align: center;
          font-weight: bold;
          text-decoration: underline;
          border-bottom: 1px solid #000;
          padding: 3pt 4pt;
        }
        .notice-memo-row {
          display: flex;
          padding: 2.5pt 5pt;
          border-bottom: 1px solid #000;
        }
        .notice-memo-row:last-child {
          border-bottom: none;
        }
        .notice-memo-label {
          font-weight: bold;
          white-space: nowrap;
          margin-right: 4pt;
        }
        .notice-memo-value {
          flex: 1;
          border-bottom: 1px solid #000;
          min-height: 11pt;
        }
        .notice-blank-line {
          display: inline-block;
          border-bottom: 1px solid #000;
          min-width: 220px;
          text-align: center;
        }
      `}</style>

      {/* WATERMARK — matches the "FOR OSAS USE ONLY" watermark in the
          Word template's page header (silver, 50% opacity, -45deg). */}
      <div className="notice-watermark">FOR OSAS USE ONLY</div>

      {/* HEADER */}
      <div className="notice-header-row">
        <img
          src={dctLogo}
          alt="DCT Logo"
          style={{ width: "60pt", height: "60pt", objectFit: "contain", flexShrink: 0 }}
        />

        <div style={{ textAlign: "center" }}>
          <p style={{ fontWeight: "bold", fontSize: "13pt", margin: 0 }}>
            DOMINICAN COLLEGE OF TARLAC, INC.
          </p>
          <p style={{ fontWeight: "bold", fontSize: "10.5pt", margin: "1pt 0 0" }}>
            OFFICE OF STUDENT AFFAIRS AND SERVICES
          </p>
          <p style={{ fontSize: "9pt", margin: "2pt 0 0" }}>
            McArthur Highway, Poblacion (Sto. Rosario), Capas, 2315 Tarlac, Philippines
          </p>
          <p style={{ fontSize: "9pt", margin: "1pt 0 0" }}>
            Institutional Contact Nos.: +63938-918-4093 / +63966-399-2750 / +63966-399-2752
          </p>
          <p style={{ fontSize: "9pt", margin: "1pt 0 0" }}>
            Website: dct.edu.ph | E-mail: domct_2315@yahoo.com.ph / domct_2315@dct.edu.ph
          </p>
        </div>

        <img
          src={osasLogo}
          alt="OSAS Logo"
          style={{ width: "60pt", height: "60pt", objectFit: "contain", flexShrink: 0 }}
        />
      </div>
      <div className="notice-header-rule" />

      <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "6pt" }}>
        <div className="notice-memo-box">
          <div className="notice-memo-title">NOTICE OF COMPLAINT</div>
          <div className="notice-memo-row">
            <span className="notice-memo-label">Date:</span>
            <span className="notice-memo-value">{printDate}</span>
          </div>
          <div className="notice-memo-row">
            <span className="notice-memo-label">Student Name:</span>
            <span className="notice-memo-value">{caseData.name}</span>
          </div>
          <div className="notice-memo-row">
            <span className="notice-memo-label">Section:</span>
            <span className="notice-memo-value">{programLine}</span>
          </div>
          <div className="notice-memo-row">
            <span className="notice-memo-label">Subject:</span>
            <span className="notice-memo-value">
              {caseData.subject || "Notice of Complaint"}
            </span>
          </div>
        </div>
      </div>

      {/* TITLE */}
      <p
        style={{
          textAlign: "center",
          fontWeight: "bold",
          textDecoration: "underline",
          margin: "14pt 0 16pt",
          fontSize: "13pt",
        }}
      >
        NOTICE OF COMPLAINT
      </p>

      {/* SALUTATION */}
      <p>Dear Mr./Ms. {caseData.name}:</p>

      <p style={{ textAlign: "justify" }}>
        This is to formally notify you that a complaint/incident report has
        been filed against you in connection with an incident that occurred
        on <strong>{formatNiceDate(caseData.incidentDate)}</strong> at{" "}
        <strong>{caseData.location}</strong>. The nature of the complaint is
        described as follows:
      </p>

      <p style={{ fontWeight: "bold", marginBottom: "4pt" }}>
        Summary of Complaint:
      </p>
      <p
        style={{
          whiteSpace: "pre-wrap",
          textAlign: "justify",
          minHeight: "40pt",
        }}
      >
        {caseData.offense}
      </p>

      <p>
        In line with the Student Handbook and the disciplinary policies of
        Dominican College of Tarlac, you are hereby required to:
      </p>

      <ol style={{ margin: "0 0 6pt 0", paddingLeft: "20pt" }}>
        <li style={{ marginBottom: "4pt" }}>
          Submit a written explanation regarding the incident within{" "}
          <span className="notice-blank-line" style={{ minWidth: "140px" }}>
            {responseDays ? responseDays : "\u00A0"}
          </span>{" "}
          from receipt of this notice.
        </li>
        <li>
          Attend a preliminary meeting/investigation scheduled on{" "}
          <span className="notice-blank-line">
            {investigationDateTime ? investigationDateTime : "\u00A0"}
          </span>{" "}
          at the OSAS Office.
        </li>
      </ol>

      <p style={{ textAlign: "justify" }}>
        Failure to comply with this notice may result in the resolution of
        the case based on the available evidence and may affect the decision
        of the Disciplinary Board.
      </p>
      <p style={{ textAlign: "justify" }}>
        We assure you that due process shall be observed and you will be
        given the opportunity to present your side.
      </p>
      <p>Thank you for your cooperation.</p>

      {/* SIGNATURES */}
      <div style={{ marginTop: "12pt" }}>
        <p>Respectfully,</p>
        <p style={{ fontWeight: "bold", marginTop: "14pt", marginBottom: 0 }}>
          {coordinatorName}
        </p>
        <p style={{ margin: 0 }}>Coordinator, Office of Student Affairs and Services</p>
        <p style={{ marginTop: "4pt" }}>Date: ______________</p>
      </div>

      <div style={{ marginTop: "10pt" }}>
        <p>Noted by:</p>
        <p style={{ fontWeight: "bold", marginTop: "14pt", marginBottom: 0 }}>
          {headName}
        </p>
        <p style={{ margin: 0 }}>Head, Office of Student Affairs and Services.</p>
        <p style={{ marginTop: "4pt" }}>Date: _______________</p>
      </div>
    </div>
  );
}