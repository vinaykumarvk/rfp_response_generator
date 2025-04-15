import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RfpFormData } from "@/lib/types";

interface TechnicalTemplateProps {
  data: RfpFormData;
}

export default function TechnicalTemplate({ data }: TechnicalTemplateProps) {
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
        <h2 className="text-xl text-center text-gray-600 mb-4">Technical Proposal Response</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p><strong>Prepared By:</strong> {data.companyName}</p>
            <p><strong>Technical Lead:</strong> {data.pointOfContact}</p>
          </div>
          <div className="text-right">
            <p><strong>Client:</strong> {data.clientName}</p>
            <p><strong>Submission Date:</strong> {currentDate}</p>
            <p><strong>RFP Reference:</strong> {data.rfpId}</p>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <section>
        <h3 className="text-xl font-bold mb-3">Executive Summary</h3>
        <p className="text-gray-700">
          {data.companyName} is pleased to present this technical proposal in response to 
          {data.clientName}'s RFP for {data.rfpTitle}. As specialists in technical solutions for 
          the {data.clientIndustry} industry, we have developed a comprehensive approach to address 
          your specific requirements.
        </p>
        <p className="text-gray-700 mt-2">
          Our proposal outlines a robust technical solution that leverages modern technologies and 
          proven methodologies to deliver a scalable, secure, and efficient system that will meet your 
          current needs and support future growth.
        </p>
      </section>

      {/* Technical Approach */}
      <section>
        <h3 className="text-xl font-bold mb-3">Technical Approach</h3>
        <p className="text-gray-700">
          Our approach to the {data.rfpTitle} project is guided by the following principles:
        </p>
        <ul className="list-disc pl-6 mt-2 text-gray-700">
          <li>User-centered design focusing on simplicity and efficiency</li>
          <li>Modular architecture to enable flexibility and scalability</li>
          <li>Industry standard security practices and protocols</li>
          <li>Performance optimization to ensure responsive user experience</li>
          <li>Comprehensive testing strategy to ensure quality and reliability</li>
        </ul>
        <p className="text-gray-700 mt-2">
          Based on our understanding of your requirements as stated in the project summary:
        </p>
        <p className="text-gray-700 mt-2 italic">
          "{data.projectSummary}"
        </p>
      </section>

      {/* Architecture Overview */}
      <section>
        <h3 className="text-xl font-bold mb-3">Architecture Overview</h3>
        <p className="text-gray-700">
          We propose a multi-tiered architecture with the following components:
        </p>
        <ul className="list-disc pl-6 mt-2 text-gray-700">
          <li><strong>Presentation Layer:</strong> Responsive web interface optimized for all devices</li>
          <li><strong>Application Layer:</strong> Business logic and process management</li>
          <li><strong>Data Layer:</strong> Secure data storage and retrieval</li>
          <li><strong>Integration Layer:</strong> APIs and connectors for third-party systems</li>
        </ul>
        <p className="text-gray-700 mt-2">
          This architecture provides clear separation of concerns, making the system easier to develop, 
          maintain, and scale as your needs evolve.
        </p>
      </section>

      {/* Technology Stack */}
      <section>
        <h3 className="text-xl font-bold mb-3">Technology Stack</h3>
        <p className="text-gray-700">
          Based on your project requirements, we recommend the following technology stack:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          <div className="border rounded-md p-3">
            <h4 className="font-semibold mb-2">Frontend</h4>
            <ul className="list-disc pl-6 text-gray-700">
              <li>React for component-based UI development</li>
              <li>TypeScript for type safety and code maintainability</li>
              <li>Tailwind CSS for responsive design</li>
              <li>Redux for state management</li>
            </ul>
          </div>
          <div className="border rounded-md p-3">
            <h4 className="font-semibold mb-2">Backend</h4>
            <ul className="list-disc pl-6 text-gray-700">
              <li>Node.js with Express for API development</li>
              <li>PostgreSQL for relational data storage</li>
              <li>Redis for caching and performance</li>
              <li>Docker for containerization</li>
            </ul>
          </div>
          <div className="border rounded-md p-3">
            <h4 className="font-semibold mb-2">Infrastructure</h4>
            <ul className="list-disc pl-6 text-gray-700">
              <li>AWS for cloud hosting and services</li>
              <li>Kubernetes for container orchestration</li>
              <li>Terraform for infrastructure as code</li>
              <li>GitHub Actions for CI/CD pipelines</li>
            </ul>
          </div>
          <div className="border rounded-md p-3">
            <h4 className="font-semibold mb-2">Monitoring & Support</h4>
            <ul className="list-disc pl-6 text-gray-700">
              <li>Datadog for comprehensive monitoring</li>
              <li>ELK stack for logging and analysis</li>
              <li>PagerDuty for alerts and incidents</li>
              <li>Zendesk for support ticketing</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Security Considerations */}
      <section>
        <h3 className="text-xl font-bold mb-3">Security Considerations</h3>
        <p className="text-gray-700">
          Security is a top priority in our technical approach. We will implement:
        </p>
        <ul className="list-disc pl-6 mt-2 text-gray-700">
          <li><strong>Authentication:</strong> Multi-factor authentication and SSO integration</li>
          <li><strong>Authorization:</strong> Role-based access control with fine-grained permissions</li>
          <li><strong>Data Protection:</strong> Encryption at rest and in transit</li>
          <li><strong>Audit Logging:</strong> Comprehensive logging of all system activities</li>
          <li><strong>Vulnerability Management:</strong> Regular security scans and penetration testing</li>
          <li><strong>Compliance:</strong> Adherence to industry standards and regulations</li>
        </ul>
      </section>

      {/* Implementation Methodology */}
      <section>
        <h3 className="text-xl font-bold mb-3">Implementation Methodology</h3>
        <p className="text-gray-700">
          We follow an Agile development methodology with the following phases:
        </p>
        <ol className="list-decimal pl-6 mt-2 text-gray-700">
          <li><strong>Sprint 0:</strong> Project setup, team onboarding, and detailed planning</li>
          <li><strong>Development Sprints:</strong> 2-week iterations with daily standups</li>
          <li><strong>Sprint Reviews:</strong> Demonstrations of completed features</li>
          <li><strong>Sprint Retrospectives:</strong> Continuous improvement of process</li>
          <li><strong>Release Planning:</strong> Coordinated deployments to production</li>
        </ol>
        <p className="text-gray-700 mt-2">
          This approach ensures transparency, allows for regular feedback, and enables us to adapt 
          to changing requirements while maintaining project momentum.
        </p>
      </section>

      {/* Testing Strategy */}
      <section>
        <h3 className="text-xl font-bold mb-3">Testing Strategy</h3>
        <p className="text-gray-700">
          Our comprehensive testing strategy includes:
        </p>
        <ul className="list-disc pl-6 mt-2 text-gray-700">
          <li><strong>Unit Testing:</strong> Testing individual components in isolation</li>
          <li><strong>Integration Testing:</strong> Verifying interactions between components</li>
          <li><strong>Performance Testing:</strong> Ensuring the system meets performance requirements</li>
          <li><strong>Security Testing:</strong> Identifying and addressing vulnerabilities</li>
          <li><strong>User Acceptance Testing:</strong> Validation against business requirements</li>
        </ul>
        <p className="text-gray-700 mt-2">
          We employ automated testing wherever possible to ensure consistency and enable continuous integration.
        </p>
      </section>

      {/* Technical Team */}
      <section>
        <h3 className="text-xl font-bold mb-3">Technical Team</h3>
        <p className="text-gray-700">
          {data.companyName} will assign a dedicated team of technical experts to this project, including:
        </p>
        <ul className="list-disc pl-6 mt-2 text-gray-700">
          <li><strong>Technical Project Manager:</strong> Overall technical leadership and coordination</li>
          <li><strong>Solution Architect:</strong> System design and technical decisions</li>
          <li><strong>Senior Developers:</strong> Implementation of core functionality</li>
          <li><strong>QA Engineers:</strong> Quality assurance and testing</li>
          <li><strong>DevOps Engineer:</strong> Deployment and infrastructure management</li>
          <li><strong>Security Specialist:</strong> Security review and implementation</li>
        </ul>
        <p className="text-gray-700 mt-2">
          Each team member brings extensive experience in their area of specialization and a track record 
          of successful project delivery.
        </p>
      </section>

      {/* Pricing & Timeline */}
      <section>
        <h3 className="text-xl font-bold mb-3">Pricing & Timeline</h3>
        <p className="text-gray-700">
          Based on the technical requirements outlined in the RFP, we propose the following:
        </p>
        <div className="mt-2 border rounded-md p-4">
          <p className="text-gray-700">
            <strong>Estimated Budget Range:</strong> {
              data.budgetRange === 'under_50k' ? 'Under $50,000' : 
              data.budgetRange === '50k_100k' ? '$50,000 - $100,000' :
              data.budgetRange === '100k_250k' ? '$100,000 - $250,000' :
              data.budgetRange === '250k_500k' ? '$250,000 - $500,000' :
              data.budgetRange === 'over_500k' ? 'Over $500,000' :
              'To be determined based on final scope'
            }
          </p>
          <p className="text-gray-700 mt-1">
            <strong>Estimated Timeline:</strong> 4-6 months from project kickoff to full deployment
          </p>
          <p className="text-gray-700 mt-1">
            <strong>Project Completion Target:</strong> Prior to your deadline of {formatDate(data.submissionDate)}
          </p>
        </div>
        <p className="text-gray-700 mt-2">
          A detailed technical implementation plan with specific milestones and deliverables will be 
          provided upon project initiation.
        </p>
      </section>

      {/* Conclusion */}
      <section className="border-t pt-6">
        <h3 className="text-xl font-bold mb-3">Conclusion</h3>
        <p className="text-gray-700">
          {data.companyName} is committed to delivering a high-quality technical solution that meets all 
          of {data.clientName}'s requirements for the {data.rfpTitle} project. Our experienced team, 
          proven methodology, and technical expertise make us the ideal partner for this initiative.
        </p>
        <p className="text-gray-700 mt-2">
          We look forward to the opportunity to discuss our proposal in more detail and answer any 
          questions you may have.
        </p>
        <p className="text-gray-700 mt-4">
          <strong>Technical Contact:</strong> For any technical questions or clarifications regarding 
          this proposal, please contact {data.pointOfContact}.
        </p>
      </section>
    </div>
  );
}
