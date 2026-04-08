export default function PlaceholderPage({ title, description }) {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-gray-500 dark:text-dark-muted bg-[#DBEAFE] px-4 py-2 rounded-full">
        {title}{description ? ` - ${description}` : ''}
      </p>
    </div>
  );
}
