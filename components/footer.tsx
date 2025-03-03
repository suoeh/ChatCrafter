"use client"

import { Code2, Globe, Github } from "lucide-react";

export default function Footer() {
    return (
      <footer className="flex justify-center space-x-4 mt-8 text-gray-600">
        <a
          href="https://github.com/suoeh/ChatCrafter/"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-all duration-300 ease hover:scale-[1.3]"
        >
          <Code2 className="w-6 h-6 transition-colors duration-300 ease hover:text-gray-700" />
        </a>
        <a
          href="https://github.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-all duration-300 ease hover:scale-[1.3]"
        >
          <Github className="w-6 h-6 transition-colors duration-300 ease hover:text-gray-700" />
        </a>
        <a
          href="https://dylandai.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-all duration-300 ease hover:scale-[1.3]"
        >
          <Globe className="w-6 h-6 transition-colors duration-300 ease hover:text-gray-700" />
        </a>
        <p className="text-sm text-gray-600">Dylan Dai © 2025</p>
      </footer>
    )
}
