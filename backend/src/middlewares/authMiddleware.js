import { verifyToken } from '../utils/jwt.js';

const authMiddleware = (request, response, next) => {
  const authorization = request.get('Authorization');

  if (!authorization?.startsWith('Bearer ')) {
    return response.status(401).json({ message: 'Authentication required' });
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    return response.status(401).json({ message: 'Authentication required' });
  }

  try {
    const payload = verifyToken(token);

    if (typeof payload !== 'object' || !payload.userId) {
      return response.status(401).json({ message: 'Invalid token' });
    }

    request.user = { id: payload.userId };
    return next();
  } catch {
    return response.status(401).json({ message: 'Invalid or expired token' });
  }
};

export default authMiddleware;
