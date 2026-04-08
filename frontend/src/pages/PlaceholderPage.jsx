export default function PlaceholderPage({ title, description }) {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-gray-500 dark:text-dark-muted">
        {title}{description ? ` - ${description}` : ''}
      </p>
    </div>
  );
}
