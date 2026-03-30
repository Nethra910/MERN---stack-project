export default function DashboardHome() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const features = [
    { icon: '💬', title: 'Real-time Chat', desc: 'Message friends instantly with live updates' },
    { icon: '👥', title: 'Group Chats', desc: 'Create group conversations with multiple users' },
    { icon: '🟢', title: 'Online Status', desc: 'See who is online in real time' },
    { icon: '✍️', title: 'Typing Indicators', desc: 'Know when someone is replying' },
    { icon: '✅', title: 'Read Receipts', desc: 'Track when messages are read' },
    { icon: '🔍', title: 'User Search', desc: 'Find and connect with any verified user' },
  ];

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">
          Welcome back, {user.name || 'User'}! 👋
        </h1>
        <p className="text-gray-500">Here&apos;s what you can do with the MERN Chat App</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((f) => (
          <div
            key={f.title}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition"
          >
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-semibold text-gray-800 mb-1">{f.title}</h3>
            <p className="text-sm text-gray-500">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
