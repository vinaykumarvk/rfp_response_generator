export default function Footer() {
  return (
    <footer className="bg-white dark:bg-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-4 text-center sm:text-right border-t border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">&copy; {new Date().getFullYear()} RFP Response Generator. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
