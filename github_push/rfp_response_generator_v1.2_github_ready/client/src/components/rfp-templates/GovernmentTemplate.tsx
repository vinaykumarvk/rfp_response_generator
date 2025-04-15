import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RfpFormData } from "@/lib/types";

interface GovernmentTemplateProps {
  data: RfpFormData;
}

export default function GovernmentTemplate({ data }: GovernmentTemplateProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow-sm">
      {/* Letterhead and Date */}
      <div className="text-right mb-8">
        <p className="font-bold text-lg">{data.companyName}</p>
        <p>{data.pointOfContact}</p>
        <p>{currentDate}</p>
      </div>

      {/* Cover Letter */}
      <section>
        <p className="mb-4">
          {data.clientName}<br />
          RE: Response to Solicitation {data.rfpId} - {data.rfpTitle}
        </p>
        
        <p className="mb-2">Dear Sir/Madam,</p>
        
        <p className="text-gray-700 mb-2">
          {data.companyName} is pleased to submit the enclosed proposal in response to {data.clientName}'s 
          Request for Proposal (Solicitation #{data.rfpId}) for {data.rfpTitle}.
        </p>
        
        <p className="text-gray-700 mb-2">
          We have carefully reviewed the requirements outlined in the solicitation and are confident in our 
          ability to provide the requested services/products in full compliance with all terms, conditions, 
          and specifications contained in the RFP.
        </p>
        
        <p className="text-gray-700 mb-2">
          Our proposal demonstrates our understanding of your requirements, our approach to meeting those 
          requirements, and our relevant qualifications and experience in similar projects.
        </p>
        
        <p className="text-gray-700 mb-2">
          We look forward to the opportunity to serve {data.clientName} and contribute to the success of this 
          important initiative. Should you have any questions or require additional information, please do not 
          hesitate to contact me directly.
        </p>
        
        <p className="mt-6 mb-2">Sincerely,</p>
        <p className="font-bold">{data.pointOfContact}</p>
        <p>{data.companyName}</p>
      </section>

      {/* Formal Title Page */}
      <div className="page-break border-t-2 border-b-2 border-black py-10 my-10 text-center">
        <h1 className="text-3xl font-bold mb-6">{data.rfpTitle}</h1>
        <h2 className="text-2xl mb-8">Request for Proposal Response</h2>
        <h3 className="text-xl mb-2">Solicitation Number: {data.rfpId}</h3>
        <h3 className="text-xl mb-8">Submission Deadline: {formatDate(data.submissionDate)}</h3>
        
        <div className="mt-12">
          <p className="text-lg font-bold">{data.companyName}</p>
          <p>Submitted to: {data.clientName}</p>
          <p>Date: {currentDate}</p>
        </div>
      </div>

      {/* Table of Contents */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Table of Contents</h2>
        <ol className="list-decimal pl-6 text-gray-700">
          <li>Executive Summary</li>
          <li>Statement of Compliance</li>
          <li>Technical Response</li>
          <li>Management Approach</li>
          <li>Past Performance</li>
          <li>Staffing Plan</li>
          <li>Quality Assurance</li>
          <li>Detailed Cost Proposal</li>
          <li>Required Forms & Certifications</li>
        </ol>
      </section>

      {/* Executive Summary */}
      <section>
        <h2 className="text-2xl font-bold mb-4">1. Executive Summary</h2>
        <p className="text-gray-700 mb-3">
          {data.companyName} is a qualified provider of {data.rfpTitle.toLowerCase().includes('services') ? 'services' : 'solutions'} 
          to government agencies and public sector organizations. We understand the specific requirements and challenges of the 
          {data.clientIndustry === 'government' ? ' government sector' : ` ${data.clientIndustry} sector`} and have developed our 
          proposal to address these needs comprehensively.
        </p>
        <p className="text-gray-700 mb-3">
          Our response to this RFP demonstrates our capability to deliver the requested 
          {data.rfpTitle.toLowerCase().includes('services') ? ' services' : ' solution'} in accordance with all specified requirements, 
          while providing best value to {data.clientName}.
        </p>
        <p className="text-gray-700">
          Key highlights of our proposal include:
        </p>
        <ul className="list-disc pl-6 mt-2 text-gray-700">
          <li>Full compliance with all RFP requirements and specifications</li>
          <li>Extensive experience with similar government/public sector projects</li>
          <li>Proven approach and methodology tailored to {data.clientName}'s needs</li>
          <li>Qualified team with relevant expertise and certifications</li>
          <li>Competitive pricing and superior value proposition</li>
        </ul>
      </section>

      {/* Statement of Compliance */}
      <section>
        <h2 className="text-2xl font-bold mb-4">2. Statement of Compliance</h2>
        <p className="text-gray-700 mb-3">
          {data.companyName} hereby certifies that our proposal complies with all requirements, terms, and conditions 
          specified in Solicitation #{data.rfpId} for {data.rfpTitle}.
        </p>
        <p className="text-gray-700 mb-3">
          We acknowledge receipt of all amendments and addenda to the solicitation and have incorporated them into our response.
        </p>
        <p className="text-gray-700 mb-3">
          Our proposal remains valid for a period of 90 days from the submission date and we are prepared to enter into a 
          contract based on the terms outlined in the RFP.
        </p>
        <div className="border p-4 mt-4 bg-gray-50">
          <p className="text-gray-700 italic">
            "We have reviewed all requirements and specifications contained in the RFP and certify our full compliance with each."
          </p>
        </div>
      </section>

      {/* Technical Response */}
      <section>
        <h2 className="text-2xl font-bold mb-4">3. Technical Response</h2>
        <p className="text-gray-700 mb-3">
          {data.companyName} proposes the following technical approach to meet the requirements outlined in the RFP:
        </p>
        <h3 className="text-lg font-semibold mb-2">3.1 Understanding of Requirements</h3>
        <p className="text-gray-700 mb-3">
          Based on our analysis of the RFP, we understand that {data.clientName} requires:
        </p>
        <p className="text-gray-700 mb-3 italic">
          "{data.projectSummary}"
        </p>
        <h3 className="text-lg font-semibold mb-2 mt-4">3.2 Technical Approach</h3>
        <p className="text-gray-700 mb-3">
          Our approach to addressing these requirements includes:
        </p>
        <ul className="list-disc pl-6 mt-2 text-gray-700">
          <li>Comprehensive needs assessment and requirements validation</li>
          <li>Systems engineering methodology with formal documentation</li>
          <li>Phased implementation with defined milestones and deliverables</li>
          <li>Structured testing and validation procedures</li>
          <li>Knowledge transfer and training for agency personnel</li>
        </ul>
        <h3 className="text-lg font-semibold mb-2 mt-4">3.3 Technical Specifications</h3>
        <p className="text-gray-700 mb-3">
          Our proposed solution meets or exceeds all technical specifications outlined in the RFP, including:
        </p>
        <ul className="list-disc pl-6 mt-2 text-gray-700">
          <li>Compliance with relevant government standards and regulations</li>
          <li>Interoperability with existing systems</li>
          <li>Scalability to accommodate future growth</li>
          <li>Security features that meet federal requirements</li>
          <li>Accessibility compliance (Section 508)</li>
        </ul>
      </section>

      {/* Management Approach */}
      <section>
        <h2 className="text-2xl font-bold mb-4">4. Management Approach</h2>
        <p className="text-gray-700 mb-3">
          {data.companyName} will employ a structured management approach to ensure successful delivery:
        </p>
        <h3 className="text-lg font-semibold mb-2">4.1 Project Management Methodology</h3>
        <p className="text-gray-700 mb-3">
          We utilize a proven project management framework based on PMI methodologies and tailored for government 
          projects. This approach includes:
        </p>
        <ul className="list-disc pl-6 mt-2 text-gray-700">
          <li>Formal project initiation and planning</li>
          <li>Regular progress reporting and status meetings</li>
          <li>Rigorous risk management and mitigation</li>
          <li>Change control procedures</li>
          <li>Issue tracking and resolution</li>
        </ul>
        <h3 className="text-lg font-semibold mb-2 mt-4">4.2 Project Schedule</h3>
        <p className="text-gray-700 mb-3">
          Our preliminary project schedule outlines key milestones and deliverables, with completion targeted 
          before the deadline of {formatDate(data.submissionDate)}.
        </p>
        <h3 className="text-lg font-semibold mb-2 mt-4">4.3 Communication Plan</h3>
        <p className="text-gray-700 mb-3">
          We will establish clear communication channels and reporting mechanisms to ensure transparency 
          and keep stakeholders informed throughout the project lifecycle.
        </p>
      </section>

      {/* Past Performance */}
      <section>
        <h2 className="text-2xl font-bold mb-4">5. Past Performance</h2>
        <p className="text-gray-700 mb-3">
          {data.companyName} has successfully delivered similar projects for government and public sector clients:
        </p>
        <div className="border p-4 mt-2 mb-4">
          <h4 className="font-semibold">Reference Project 1</h4>
          <p className="text-gray-700"><strong>Client:</strong> Department of [Agency]</p>
          <p className="text-gray-700"><strong>Project:</strong> Similar to current RFP requirements</p>
          <p className="text-gray-700"><strong>Value:</strong> Within similar budget range</p>
          <p className="text-gray-700"><strong>Outcome:</strong> Successfully delivered on time and within budget</p>
        </div>
        <div className="border p-4 mb-4">
          <h4 className="font-semibold">Reference Project 2</h4>
          <p className="text-gray-700"><strong>Client:</strong> [Similar Agency]</p>
          <p className="text-gray-700"><strong>Project:</strong> Related scope and requirements</p>
          <p className="text-gray-700"><strong>Value:</strong> Within similar budget range</p>
          <p className="text-gray-700"><strong>Outcome:</strong> Exceeded client expectations</p>
        </div>
        <p className="text-gray-700">
          Complete reference information, including contact details, will be provided upon request.
        </p>
      </section>

      {/* Staffing Plan */}
      <section>
        <h2 className="text-2xl font-bold mb-4">6. Staffing Plan</h2>
        <p className="text-gray-700 mb-3">
          {data.companyName} will assign appropriately qualified personnel to fulfill all requirements of this project:
        </p>
        <h3 className="text-lg font-semibold mb-2">6.1 Key Personnel</h3>
        <p className="text-gray-700 mb-3">
          Our project team will include the following key roles:
        </p>
        <ul className="list-disc pl-6 mt-2 text-gray-700">
          <li><strong>Project Manager:</strong> Certified PMP with government experience</li>
          <li><strong>Subject Matter Experts:</strong> Specialists in relevant domains</li>
          <li><strong>Technical Lead:</strong> Senior technical architect</li>
          <li><strong>Quality Assurance Manager:</strong> Dedicated to ensuring deliverable quality</li>
          <li><strong>Contract Manager:</strong> Ensures compliance with contract terms</li>
        </ul>
        <h3 className="text-lg font-semibold mb-2 mt-4">6.2 Qualifications and Experience</h3>
        <p className="text-gray-700 mb-3">
          All personnel assigned to this project possess the necessary qualifications, security clearances, 
          and experience to successfully perform their roles.
        </p>
      </section>

      {/* Quality Assurance */}
      <section>
        <h2 className="text-2xl font-bold mb-4">7. Quality Assurance</h2>
        <p className="text-gray-700 mb-3">
          {data.companyName} implements comprehensive quality assurance procedures to ensure deliverables 
          meet or exceed requirements:
        </p>
        <ul className="list-disc pl-6 mt-2 text-gray-700">
          <li><strong>Quality Management System:</strong> ISO 9001:2015 compliant processes</li>
          <li><strong>Quality Control:</strong> Regular reviews and inspections</li>
          <li><strong>Performance Metrics:</strong> Defined metrics to measure quality</li>
          <li><strong>Continuous Improvement:</strong> Process for identifying and implementing improvements</li>
        </ul>
      </section>

      {/* Detailed Cost Proposal */}
      <section>
        <h2 className="text-2xl font-bold mb-4">8. Detailed Cost Proposal</h2>
        <p className="text-gray-700 mb-3">
          {data.companyName} provides the following cost proposal for the services/products described in this response:
        </p>
        <div className="border p-4 mt-2">
          <p className="text-gray-700">
            <strong>Total Estimated Project Cost:</strong> {
              data.budgetRange === 'under_50k' ? 'Under $50,000' : 
              data.budgetRange === '50k_100k' ? '$50,000 - $100,000' :
              data.budgetRange === '100k_250k' ? '$100,000 - $250,000' :
              data.budgetRange === '250k_500k' ? '$250,000 - $500,000' :
              data.budgetRange === 'over_500k' ? 'Over $500,000' :
              'To be determined based on final scope'
            }
          </p>
          <p className="text-gray-700 mt-2">
            <strong>Cost Breakdown:</strong>
          </p>
          <ul className="list-disc pl-6 mt-1 text-gray-700">
            <li>Personnel Costs: [Percentage] of total</li>
            <li>Equipment/Materials: [Percentage] of total</li>
            <li>Other Direct Costs: [Percentage] of total</li>
            <li>Indirect Costs: [Percentage] of total</li>
          </ul>
          <p className="text-gray-700 mt-2">
            <strong>Payment Schedule:</strong> In accordance with contract terms and deliverable acceptance
          </p>
        </div>
        <p className="text-gray-700 mt-3">
          A detailed line-item cost breakdown is available upon request.
        </p>
      </section>

      {/* Required Forms & Certifications */}
      <section>
        <h2 className="text-2xl font-bold mb-4">9. Required Forms & Certifications</h2>
        <p className="text-gray-700 mb-3">
          {data.companyName} has included all required forms and certifications as specified in the RFP:
        </p>
        <ul className="list-disc pl-6 mt-2 text-gray-700">
          <li>Representations and Certifications (SAM registration current)</li>
          <li>Small Business Subcontracting Plan (if applicable)</li>
          <li>Compliance with Federal Acquisition Regulation (FAR) requirements</li>
          <li>Conflict of Interest Disclosure</li>
          <li>Other required forms as specified in the RFP</li>
        </ul>
      </section>

      {/* Conclusion */}
      <section className="border-t pt-6 mt-8">
        <h2 className="text-2xl font-bold mb-4">Conclusion</h2>
        <p className="text-gray-700 mb-3">
          {data.companyName} appreciates the opportunity to submit this proposal in response to {data.clientName}'s 
          RFP for {data.rfpTitle}. We are confident in our ability to deliver the requested services/products in 
          full compliance with all requirements and to the highest standards of quality.
        </p>
        <p className="text-gray-700 mb-3">
          We look forward to the possibility of working with {data.clientName} on this important initiative and 
          are available to provide any additional information or clarification that may be required.
        </p>
        <div className="mt-6">
          <p className="font-bold">Contact Information:</p>
          <p>{data.pointOfContact}</p>
          <p>{data.companyName}</p>
        </div>
      </section>
    </div>
  );
}
