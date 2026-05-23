import React from 'react';
import { motion } from 'framer-motion';
import { FaCrown, FaStar, FaGem, FaCheckCircle } from 'react-icons/fa';

const UserBadge = ({ level, gender, role }) => {
  const isRegistered = role && role !== 'guest';

  return (
    <div className="flex items-center gap-1 shrink-0 select-none">
      {/* Gender-coloured verified tick — registered users only, no tick for guests */}
      {isRegistered && role !== 'admin' && gender === 'female' && (
        <FaCheckCircle
          size={13}
          style={{ color: '#ec4899', filter: 'drop-shadow(0 0 4px rgba(236,72,153,0.8))' }}
          title="Registered & Verified"
        />
      )}
      {isRegistered && role !== 'admin' && gender !== 'female' && (
        <FaCheckCircle
          size={13}
          style={{ color: '#0ea5e9', filter: 'drop-shadow(0 0 4px rgba(14,165,233,0.8))' }}
          title="Registered & Verified"
        />
      )}

      {/* Role and Level Indicators */}
      {role === 'admin' && (
        <span style={{ fontSize: '14px', lineHeight: 1 }} title="Admin Staff">💫</span>
      )}

      

      {(role === 'user' || !role) && isRegistered && (
        <>
          {level >= 100 ? (
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              style={{ color: '#22d3ee', filter: 'drop-shadow(0 0 5px rgba(34,211,238,0.85))', display: 'flex', alignItems: 'center' }}
              title="Level 100+ Diamond"
            >
              <FaGem size={13} />
            </motion.div>
          ) : level >= 75 ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 5, ease: "linear" }}
              style={{ color: '#fbbf24', filter: 'drop-shadow(0 0 4px rgba(251,191,36,0.8))', display: 'flex', alignItems: 'center' }}
              title="Level 75+ Golden Star"
            >
              <FaStar size={13} />
            </motion.div>
          ) : level >= 50 ? (
            <div 
              style={{ color: '#3b82f6', filter: 'drop-shadow(0 0 4px rgba(59,130,246,0.8))', display: 'flex', alignItems: 'center' }} 
              title="Level 50+ Blue Star"
            >
              <FaStar size={13} />
            </div>
          ) : level >= 25 ? (
            <div 
              style={{ color: '#22c55e', filter: 'drop-shadow(0 0 4px rgba(34,197,94,0.8))', display: 'flex', alignItems: 'center' }} 
              title="Level 25+ Green Star"
            >
              <FaStar size={13} />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

export default UserBadge;
