import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RfpFormData } from "@/lib/types";

interface StandardTemplateProps {
  data: RfpFormData;
}

export default function StandardTemplate({ data }: StandardTemplateProps) {
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
      {/* Header */}
      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold text-center mb-2">{data.rfpTitle}</h1>
        <h2 className="text-xl text-center text-gray-600 mb-4">Response to Request for Proposal</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p><strong>Submitted By:</strong> {data.companyName}</p>
            <p><strong>Contact Person:</strong> {data.pointOfContact}</p>
          </div>
          <div className="text-right">
            <p><strong>Submitted To:</strong> {data.clientName}</p>
            <p><strong>Date:</strong> {currentDate}</p>
            <p><strong>RFP ID:</strong> {data.rfpId}</p>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <section>
        <h3 className="text-xl font-bold mb-3">Executive Summary</h3>
        <p className="text-gray-700">
          {data.companyName} is pleased to submit this proposal in response to {data.clientName}'s 
          Request for Proposal for {data.rfpTitle}. We understand the importance of this project and are 
          committed to delivering a solution that meets all of your requirements and expectations.
        </p>
        <p className="text-gray-700 mt-2">
          As a leading provider in the {data.clientIndustry} industry, we bring extensive expertise and 
          a proven track record of success to this project. Our approach combines innovative thinking with 
          practical implementation strategies to ensure your objectives are met efficiently and effectively.
        </p>
      </section>

      {/* Company Background */}
      <section>
        <h3 className="text-xl font-bold mb-3">Company Background</h3>
        <p className="text-gray-700">
          {data.companyName} has established itself as a trusted partner for organizations seeking 
          {data.rfpTitle.toLowerCase().includes("implementation") ? " implementation services" : 
          data.rfpTitle.toLowerCase().includes("development") ? " development solutions" : 
          " professional services"} in the {data.clientIndustry} sector.
        </p>
        <p className="text-gray-700 mt-2">
          Our key strengths include:
        </p>
        <ul className="list-disc pl-6 mt-1 text-gray-700">
          {data.companyStrengths ? 
            data.companyStrengths.split('\n').map((strength, index) => 
              <li key={index}>{strength}</li>
            ) : 
            <li>Tailored solutions designed to meet specific client needs</li>
          }
        </ul>
      </section>

      {/* Understanding of Requirements */}
      <section>
        <h3 className="text-xl font-bold mb-3">Understanding of Requirements</h3>
        <p className="text-gray-700">
          Based on your RFP, we understand that {data.clientName} is seeking a partner to help with:
        </p>
        <p className="text-gray-700 mt-2">
          {data.projectSummary}
        </p>
      </section>

      {/* Proposed Solution */}
      <section>
        <h3 className="text-xl font-bold mb-3">Proposed Solution</h3>
        <p className="text-gray-700">
          To address your needs, {data.companyName} proposes a comprehensive solution that includes:
        </p>
        <ul className="list-disc pl-6 mt-2 text-gray-700">
          <li>Detailed analysis of current processes and requirements</li>
          <li>Custom development tailored to your specific needs</li>
          <li>Integration with existing systems and workflows</li>
          <li>Rigorous testing to ensure quality and performance</li>
          <li>Comprehensive training and documentation</li>
          <li>Ongoing support and maintenance</li>
        </ul>
      </section>

      {/* Implementation Approach */}
      <section>
        <h3 className="text-xl font-bold mb-3">Implementation Approach</h3>
        <p className="text-gray-700">
          Our implementation methodology follows industry best practices and includes the following phases:
        </p>
        <ol className="list-decimal pl-6 mt-2 text-gray-700">
          <li><strong>Discovery:</strong> Detailed requirements gathering and analysis</li>
          <li><strong>Planning:</strong> Comprehensive project planning and resource allocation</li>
          <li><strong>Design:</strong> Solution architecture and design</li>
          <li><strong>Implementation:</strong> Development and configuration</li>
          <li><strong>Testing:</strong> Quality assurance and user acceptance testing</li>
          <li><strong>Deployment:</strong> Controlled rollout of the solution</li>
          <li><strong>Support:</strong> Post-implementation support and maintenance</li>
        </ol>
      </section>

      {/* Timeline */}
      <section>
        <h3 className="text-xl font-bold mb-3">Timeline</h3>
        <p className="text-gray-700">
          We propose the following high-level timeline for this project:
        </p>
        <ul className="list-disc pl-6 mt-2 text-gray-700">
          <li><strong>Discovery & Planning:</strong> 2-3 weeks</li>
          <li><strong>Design & Development:</strong> 6-8 weeks</li>
          <li><strong>Testing & Quality Assurance:</strong> 2-3 weeks</li>
          <li><strong>Deployment & Training:</strong> 2 weeks</li>
          <li><strong>Post-Implementation Support:</strong> Ongoing</li>
        </ul>
        <p className="text-gray-700 mt-2">
          We are committed to meeting your deadline of {formatDate(data.submissionDate)}.
        </p>
      </section>

      {/* Pricing */}
      <section>
        <h3 className="text-xl font-bold mb-3">Pricing</h3>
        <p className="text-gray-700">
          Based on the information provided in the RFP, we estimate the following investment for this project:
        </p>
        <div className="mt-2 border rounded-md p-4">
          <p className="text-gray-700">
            <strong>Budget Range:</strong> {
              data.budgetRange === 'under_50k' ? 'Under $50,000' : 
              data.budgetRange === '50k_100k' ? '$50,000 - $100,000' :
              data.budgetRange === '100k_250k' ? '$100,000 - $250,000' :
              data.budgetRange === '250k_500k' ? '$250,000 - $500,000' :
              data.budgetRange === 'over_500k' ? 'Over $500,000' :
              'To be determined based on final scope'
            }
          </p>
          <p className="text-gray-700 mt-1">
            <strong>Payment Terms:</strong> 30% upon project initiation, 40% at midpoint milestones, 30% upon completion
          </p>
        </div>
        <p className="text-gray-700 mt-2">
          A detailed cost breakdown will be provided upon request.
        </p>
      </section>

      {/* Closing */}
      <section className="border-t pt-6">
        <h3 className="text-xl font-bold mb-3">Conclusion</h3>
        <p className="text-gray-700">
          {data.companyName} appreciates the opportunity to submit this proposal and looks forward to 
          the possibility of working with {data.clientName} on this important project. We are confident 
          in our ability to deliver a solution that exceeds your expectations and provides lasting value 
          to your organization.
        </p>
        <p className="text-gray-700 mt-4">
          <strong>Contact:</strong> For any questions or clarifications regarding this proposal, 
          please contact {data.pointOfContact}.
        </p>
      </section>
    </div>
  );
}
