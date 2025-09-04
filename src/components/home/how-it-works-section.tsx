interface StepProps {
  number: string;
  title: string;
  description: string;
  gradientFrom: string;
  gradientTo: string;
}

function Step({
  number,
  title,
  description,
  gradientFrom,
  gradientTo,
}: StepProps) {
  return (
    <div className="text-center group">
      <div
        className={`w-20 h-20 rounded-2xl bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white flex items-center justify-center mb-6 mx-auto shadow-xl group-hover:scale-110 transition-transform duration-300`}
      >
        <span className="text-2xl font-bold">{number}</span>
      </div>
      <h3
        className={`text-xl font-bold mb-3 bg-gradient-to-r ${gradientFrom} ${gradientTo} bg-clip-text text-transparent`}
      >
        {title}
      </h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

export function HowItWorksSection() {
  return (
    <section className="mb-16 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-purple-50/60 to-indigo-50/80 rounded-2xl backdrop-blur-sm"></div>
      <div className="relative p-8 md:p-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center animate-fade-in-up">
          <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
            How It Works
          </span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Step
            number="1"
            title="Search"
            description="Enter a book title, author, or topic to find books from the Google Books library with intelligent matching."
            gradientFrom="from-blue-600"
            gradientTo="to-purple-600"
          />
          <Step
            number="2"
            title="Select"
            description="Choose a book from the search results and explore its comprehensive details and metadata."
            gradientFrom="from-purple-600"
            gradientTo="to-pink-600"
          />
          <Step
            number="3"
            title="Summarize"
            description="Request an AI-generated summary tailored to your specific needs and reading goals."
            gradientFrom="from-pink-600"
            gradientTo="to-indigo-600"
          />
        </div>
      </div>
    </section>
  );
}
