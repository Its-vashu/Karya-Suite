import React from "react";
import { useParams, Link } from "react-router-dom";

// Dummy blog post data (should match Blog.js)
const blogPosts = [
  {
    id: 1,
    title: "How Concientech Empowers Digital Transformation",
    date: "2025-06-15",
    image: "https://staging.concientech.com/wp-content/uploads/2025/04/robin-logo-3.png",
    content: `Concientech is at the forefront of digital transformation, helping businesses embrace innovation with scalable, secure, and smart solutions. Our team leverages the latest technologies to streamline operations, enhance productivity, and drive growth.\n\nFrom cloud migration to AI-driven analytics, we provide end-to-end support for your digital journey. Partner with us to unlock new opportunities and stay ahead in a rapidly evolving market.`
  },
  {
    id: 2,
    title: "5 Ways to Secure Your Business Data in 2025",
    date: "2025-05-28",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",
    content: `Data security is more important than ever. Here are five strategies to keep your business data safe in 2025:\n\n1. Implement Zero Trust Architecture\n2. Use AI-powered threat detection\n3. Regularly update and patch systems\n4. Train employees on cybersecurity\n5. Encrypt sensitive data\n\nStay proactive and protect your business from evolving threats.`
  },
  {
    id: 3,
    title: "Meet the Team: Innovators Behind Concientech",
    date: "2025-05-10",
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=400&q=80",
    content: `Our team is our greatest asset. Get to know the passionate professionals driving Concientech's success and client satisfaction.\n\nFrom software engineers to project managers, each member brings unique skills and a commitment to excellence. Together, we deliver innovative solutions that empower our clients to achieve their goals.`
  }
];

const BlogPost = () => {
  const { id } = useParams();
  const post = blogPosts.find((p) => p.id === Number(id));

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Post Not Found</h2>
          <Link to="/blog" className="text-blue-600 hover:underline">← Back to Blog</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <img src={post.image} alt={post.title} className="w-full h-56 object-cover rounded-lg mb-6" />
        <div className="text-xs text-gray-400 mb-2">
          {new Date(post.date).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
        </div>
        <h1 className="text-3xl font-bold text-blue-800 mb-4">{post.title}</h1>
        <div className="text-gray-700 text-lg whitespace-pre-line mb-8">{post.content}</div>
        <Link to="/blog" className="text-blue-600 hover:underline">← Back to Blog</Link>
      </div>
    </div>
  );
};

export default BlogPost;
