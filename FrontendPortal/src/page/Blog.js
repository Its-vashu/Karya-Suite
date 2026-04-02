
import React from "react";
import { Link } from "react-router-dom";

const blogPosts = [
  {
    id: 1,
    title: "How Concientech Empowers Digital Transformation",
    date: "2025-06-15",
    summary:
      "Discover how Concientech helps businesses embrace digital innovation with scalable, secure, and smart solutions.",
    image:
      "https://staging.concientech.com/wp-content/uploads/2025/04/robin-logo-3.png",
    link: "/blog/1"
  },
  {
    id: 2,
    title: "5 Ways to Secure Your Business Data in 2025",
    date: "2025-05-28",
    summary:
      "Explore the latest strategies and technologies for keeping your business data safe and compliant.",
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",
    link: "/blog/2"
  },
  {
    id: 3,
    title: "Meet the Team: Innovators Behind Concientech",
    date: "2025-05-10",
    summary:
      "Get to know the passionate professionals driving Concientech's success and client satisfaction.",
    image:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=400&q=80",
    link: "/blog/3"
  }
];

const Blog = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-blue-700 mb-8 text-center">Concientech Blog</h1>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {blogPosts.map((post) => (
            <div
              key={post.id}
              className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col hover:shadow-2xl transition-shadow duration-200"
            >
              <img
                src={post.image}
                alt={post.title}
                className="h-40 w-full object-cover"
              />
              <div className="p-6 flex flex-col flex-1">
                <div className="text-xs text-gray-400 mb-2">
                  {new Date(post.date).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                  })}
                </div>
                <h2 className="text-2xl font-semibold text-blue-800 mb-2">
                  {post.title}
                </h2>
                <p className="text-gray-600 flex-1 mb-4">{post.summary}</p>
                <Link
                  to={post.link}
                  className="inline-block mt-auto text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                >
                  Read More →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Blog;
