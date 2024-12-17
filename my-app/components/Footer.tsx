import Link from 'next/link'
import { Github, Twitter, Linkedin, Mail } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-100 border-t border-gray-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-wrap justify-between items-start space-y-4 md:space-y-0">
          <div className="w-full md:w-auto mb-4 md:mb-0">
            <p className="text-sm">&copy; {new Date().getFullYear()} StatsX. All rights reserved.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2 text-blue-400">Quick Links</h3>
            <div className="flex space-x-4">
              <Link href="/" className="text-sm hover:text-blue-400 transition-colors">Home</Link>
              <Link href="/defense-analysis" className="text-sm hover:text-blue-400 transition-colors">Defense</Link>
              <Link href="/player-stats" className="text-sm hover:text-blue-400 transition-colors">Players</Link>
              <Link href="/player-projections" className="text-sm hover:text-blue-400 transition-colors">Projections</Link>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2 text-blue-400">Connect With Us</h3>
            <div className="flex space-x-3">
              <a href="https://github.com/alexrendlerCS" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="https://www.linkedin.com/in/alex-rendler/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="mailto:alexrendler@yahoo.com" className="hover:text-blue-400 transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

