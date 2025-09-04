import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="mb-16 text-center relative">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-indigo-600/10 rounded-2xl"></div>
      <div className="relative p-8">
        <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-purple-700 to-blue-700 bg-clip-text text-transparent">
          Ready to Transform Your Reading?
        </h2>
        <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
          Join thousands of readers who are saving time and gaining knowledge
          with KeeperAI's intelligent book discovery and summarization.
        </p>
        <Button
          size="lg"
          className="h-14 px-10 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 hover:from-purple-700 hover:via-blue-700 hover:to-indigo-700 text-white font-semibold text-lg rounded-xl shadow-2xl hover:scale-105 transition-all duration-300"
        >
          Start Your Journey
        </Button>
      </div>
    </section>
  );
}
