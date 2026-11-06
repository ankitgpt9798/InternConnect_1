import dns from 'node:dns';
import mongoose from 'mongoose';

export default async function connectDB() {
  // On some Windows networks Node cannot resolve a mongodb+srv:// address with the default DNS.
  // DNS_SERVERS (e.g. "8.8.8.8,1.1.1.1") tells Node which DNS servers to use instead.
  if (process.env.DNS_SERVERS) {
    dns.setServers(process.env.DNS_SERVERS.split(',').map((server) => server.trim()));
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected (database: ${conn.connection.name})`);
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
}
