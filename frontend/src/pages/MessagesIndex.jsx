export default function MessagesIndex() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="w-24 h-24 bg-gray-100 dark:bg-dark-hover rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-5xl">💬</span>
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-2">
          Welcome to Messages
        </h3>
        <p className="text-gray-500 dark:text-dark-muted text-sm">
          Select a conversation to start messaging
        </p>
      </div>
    </div>
  );
}
