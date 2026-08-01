// Ported verbatim from Component.SERVICE_DESCRIPTIONS (Ossa Fee Proposal
// App.dc.html lines 1419-1431). Copy is unchanged, including bullet points
// and deliverables lists -- this is the source of truth for both the
// printed proposal's Section B and the on-screen "yellow" editable
// override textareas.

export interface ServiceDescription {
  title: string;
  body: string;
}

export const SERVICE_DESCRIPTIONS: Record<string, ServiceDescription> = {
  ec: {
    title: "Existing Conditions Documentation",
    body: "Accurate documentation of existing conditions provides the foundation for a successful design project. During this phase, Ossa Studio performs a comprehensive field survey to verify existing building conditions, collect dimensional information, document architectural features, and develop accurate Existing Conditions drawings. These drawings serve as the basis for design while reducing uncertainty, minimizing unforeseen conditions, and supporting informed project decisions.\n\nTypical Services\n• Field measurements\n• Site verification\n• Photographic documentation\n• Existing building documentation\n• Review of available record drawings\n• Existing conditions plan development\n\nDeliverables\n• Existing conditions floor plans\n• Existing reflected ceiling plans (as applicable)\n• Existing exterior elevations (as applicable)\n• Existing building sections (as applicable)\n• Existing site plan (as applicable)\n• CAD/BIM base drawings",
  },
  sd: {
    title: "Schematic Design (SD)",
    body: "During Schematic Design, Ossa Studio transforms the project vision into conceptual solutions. Multiple design ideas are explored, evaluated, and refined with the client. Major decisions regarding layout, circulation, building character, and functionality are established before moving into detailed design.\n\nTypical Services\n• Concept development\n• Floor plan alternatives\n• Preliminary exterior design\n• Initial building systems coordination\n• Preliminary code review\n• Client design meetings\n\nDeliverables\n• Schematic floor plans\n• Preliminary elevations\n• Conceptual renderings (as applicable)\n• Preliminary site plans\n• Opinion of probable construction cost",
  },
  dd: {
    title: "Design Development (DD)",
    body: "The selected design is refined into a coordinated architectural solution. Building systems, materials, finishes, structural concepts, and engineering disciplines are integrated to ensure the project is technically sound, buildable, and aligned with the project budget. This phase significantly reduces uncertainty before construction documents begin.\n\nTypical Services\n• Refined architectural plans\n• Interior finish selections\n• Exterior material selection\n• Coordination with structural, mechanical, electrical, and plumbing engineers\n• Accessibility and life safety coordination\n• Owner review meetings\n\nDeliverables\n• Design Development drawings\n• Preliminary finish schedules\n• Material selections\n• Updated construction cost estimate",
  },
  cd: {
    title: "Construction Documents (CD)",
    body: "Construction Documents translate the approved design into detailed technical drawings and specifications that contractors use for pricing, permitting, and construction. Accuracy, coordination, and clarity are emphasized to minimize conflicts and reduce change orders during construction.\n\nTypical Services\n• Detailed architectural drawings\n• Technical detailing\n• Specifications\n• Engineering coordination\n• Permit documentation\n• Quality control reviews\n\nDeliverables\n• Complete construction drawing set\n• Project specifications\n• Permit submission package\n• Final coordinated documents for bidding",
  },
  bidding: {
    title: "Bidding & Negotiation",
    body: "Ossa Studio assists the Owner during contractor procurement by responding to bidder questions, issuing clarifications, reviewing bids, and helping evaluate contractor qualifications. The objective is to obtain competitive pricing while ensuring bidders fully understand the project scope.\n\nTypical Services\n• Respond to Requests for Information (RFIs)\n• Issue addenda\n• Review contractor bids\n• Evaluate qualifications\n• Assist with contractor selection\n• Support contract negotiations\n\nDeliverables\n• Bid clarifications\n• Addenda\n• Bid analysis\n• Recommendation for award",
  },
  ca: {
    title: "Construction Administration (CA)",
    body: "During construction, Ossa Studio serves as the Owner’s professional representative, helping ensure the project is built in accordance with the contract documents. The team reviews submittals, answers contractor questions, performs site observations, evaluates completed work, and assists with issue resolution throughout construction. Our role is to help maintain quality, reduce risk, and support successful project delivery—not to direct the contractor’s means and methods.\n\nTypical Services\n• Construction site observations\n• Shop drawing and submittal review\n• Responses to RFIs\n• Supplemental instructions\n• Change order review\n• Pay application review\n• Punch list inspections\n• Substantial and final completion reviews\n\nDeliverables\n• Observation reports\n• Reviewed submittals\n• Change order recommendations\n• Punch lists\n• Certificate of Substantial Completion\n• Project closeout assistance",
  },
  hourlyCa: {
    title: "Construction Administration (Hourly)",
    body: "During construction, Ossa Studio serves as the Owner's professional representative on an hourly basis, helping ensure the project is built in accordance with the contract documents. The team reviews submittals, answers contractor questions, performs site observations, evaluates completed work, and assists with issue resolution as needed.\n\nTypical Services\n• Construction site observations\n• Shop drawing and submittal review\n• Responses to RFIs\n• Supplemental instructions\n• Change order review\n• Pay application review\n• Punch list inspections\n• Substantial and final completion reviews\n\nDeliverables\n• Observation reports\n• Reviewed submittals\n• Change order recommendations\n• Punch lists\n• Certificate of Substantial Completion\n• Project closeout assistance",
  },
  close: {
    title: "Project Closeout",
    body: "The final phase ensures the Owner receives a complete and fully documented project. Ossa Studio assists with final inspections, closeout documentation, warranties, record drawings (when included), and transition into building occupancy.\n\nTypical Services\n• Final walkthrough\n• Verification of punch list completion\n• Closeout document review\n• Warranty documentation\n• Owner transition support\n\nDeliverables\n• Final project documentation\n• Warranty information\n• Record documents (if included in scope)\n• Project closeout package",
  },
  testfit: {
    title: "Test Fit",
    body: "A Test Fit is a preliminary planning exercise used to evaluate the feasibility of a prospective space before the client commits to a lease or full architectural design services. During this phase, Ossa Studio analyzes the client's program requirements, operational goals, and the building's existing constraints to develop conceptual layout options that demonstrate how the space can best support the client's needs. The Test Fit allows owners, tenants, and brokers to make informed leasing and investment decisions while identifying potential opportunities and challenges early in the process.\n\nTypical Services\n• Client programming and space requirements review\n• Existing building evaluation\n• Preliminary building code and occupancy review\n• Conceptual space planning\n• Alternative layout development (as applicable)\n• Preliminary demolition planning\n• Client review meetings\n\nDeliverables\n• Test Fit floor plans\n• Proposed space layout\n• Preliminary demolition plan\n• Preliminary reflected ceiling plan (as applicable)\n• Preliminary building code analysis\n• Space utilization summary\n• Planning assumptions and recommendations",
  },
  projectManual: {
    title: "Project Manual (Specifications)",
    body: "The Project Manual complements the construction drawings by providing the written requirements for materials, products, workmanship, quality standards, bidding requirements, and contract administration. Together with the Construction Documents, the Project Manual establishes the technical requirements necessary for competitive bidding and successful project construction.\n\nTypical Services\n• Technical specifications\n• Product and material requirements\n• Quality standards\n• Division specifications\n• Bidding requirements\n• Contract forms and documentation\n\nDeliverables\n• Project Manual\n• Technical specifications\n• Division specifications\n• Bid forms (as applicable)\n• Contract documents (as applicable)",
  },
  vr: {
    title: "Renderings",
    body: "Renderings communicate the architectural design through three-dimensional visualizations that help clients, stakeholders, and reviewing agencies better understand the project. Depending on project requirements, renderings may range from conceptual massing studies to fully rendered photorealistic images.\n\nTypical Services\n• Three-dimensional modeling\n• Exterior perspectives\n• Interior perspectives\n• Material visualization\n• Presentation graphics\n• Client presentation support\n\nDeliverables\n• 3D building model (as applicable)\n• Exterior renderings\n• Interior renderings (as applicable)\n• Presentation images\n• Digital presentation files",
  },
};
