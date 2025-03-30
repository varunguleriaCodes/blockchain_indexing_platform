"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

interface Webhook {
  id: string;
  webhookId: string;
  walletAddress: string;
  transactionTypes: string[];
  createdAt: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    host: "",
    port: "",
    database: "",
    username: "",
    password: "",
    walletAddress: "",
    categories: {
      transfer: false,
      nft_bids: false,
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);

  useEffect(() => {
    const accessToken = sessionStorage.getItem("accessToken");
    if (!accessToken) {
      router.push("/login");
      return;
    }
    loadWebhooks();
  }, [router]);

  const loadWebhooks = async () => {
    try {
      const accessToken = sessionStorage.getItem("accessToken");
      const user = JSON.parse(sessionStorage.getItem("user") || "{}");
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/helius/webhooks?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      setWebhooks(response.data);
    } catch (error) {
      console.error('Error loading webhooks:', error);
      setError('Failed to load webhooks');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const accessToken = sessionStorage.getItem('accessToken');
      const user = JSON.parse(sessionStorage.getItem("user") || "");
      
      // Create PostgreSQL connection
      const postgresResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/postgres/connections?userId=${user.id}`,
        {
          host: formData.host,
          port: formData.port,
          database: formData.database,
          username: formData.username,
          password: formData.password
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      // Create webhook with selected categories
      const selectedCategories = Object.entries(formData.categories)
        .filter(([_, isSelected]) => isSelected)
        .map(([category]) => category);

      if (selectedCategories.length === 0) {
        throw new Error("Please select at least one category");
      }

      // Create webhook
      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/helius/create-webhook`,
        {
          accountAddresses: formData.walletAddress ? formData.walletAddress.split(",").map(addr => addr.trim()) : [],
          transactionTypes: selectedCategories,
          userId: user.id
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      setSuccess("PostgreSQL connection and webhook created successfully!");
      handleCancel();
      loadWebhooks();
    } catch (error: any) {
      console.error("Error:", error);
      setError(error.response?.data?.message || error.message || "Failed to setup connection and webhook");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    try {
      const accessToken = sessionStorage.getItem('accessToken');
      await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/helius/webhook/${webhookId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      setSuccess('Webhook deleted successfully');
      loadWebhooks(); // Reload webhooks list
    } catch (error) {
      console.error('Error deleting webhook:', error);
      setError('Failed to delete webhook');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        categories: {
          ...prev.categories,
          [name]: checked
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleCancel = () => {
    setFormData({
      host: "",
      port: "",
      database: "",
      username: "",
      password: "",
      walletAddress: "",
      categories: {
        transfer: false,
        nft_bids: false,
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="p-8 rounded border border-gray-200 bg-white">
          <h1 className="font-medium text-3xl">Setup Database & Webhook</h1>
          <p className="text-gray-600 mt-6">
            Enter your PostgreSQL database connection details and webhook configuration.
          </p>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-red-600">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded text-green-600">
              {success}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mt-8">
              <h2 className="text-xl font-medium mb-4">Database Connection</h2>
              <div className="grid lg:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="host" className="text-sm text-gray-700 block mb-1 font-medium">
                    Host
                  </label>
                  <input
                    type="text"
                    name="host"
                    id="host"
                    value={formData.host}
                    onChange={handleInputChange}
                    className="bg-gray-100 border border-gray-200 rounded py-1 px-3 block focus:ring-blue-500 focus:border-blue-500 text-gray-700 w-full"
                    placeholder="localhost or IP address"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="port" className="text-sm text-gray-700 block mb-1 font-medium">
                    Port
                  </label>
                  <input
                    type="text"
                    name="port"
                    id="port"
                    value={formData.port}
                    onChange={handleInputChange}
                    className="bg-gray-100 border border-gray-200 rounded py-1 px-3 block focus:ring-blue-500 focus:border-blue-500 text-gray-700 w-full"
                    placeholder="5432"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="database" className="text-sm text-gray-700 block mb-1 font-medium">
                    Database Name
                  </label>
                  <input
                    type="text"
                    name="database"
                    id="database"
                    value={formData.database}
                    onChange={handleInputChange}
                    className="bg-gray-100 border border-gray-200 rounded py-1 px-3 block focus:ring-blue-500 focus:border-blue-500 text-gray-700 w-full"
                    placeholder="Enter database name"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="username" className="text-sm text-gray-700 block mb-1 font-medium">
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    id="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="bg-gray-100 border border-gray-200 rounded py-1 px-3 block focus:ring-blue-500 focus:border-blue-500 text-gray-700 w-full"
                    placeholder="Database username"
                    required
                  />
                </div>

                <div className="lg:col-span-2">
                  <label htmlFor="password" className="text-sm text-gray-700 block mb-1 font-medium">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    id="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="bg-gray-100 border border-gray-200 rounded py-1 px-3 block focus:ring-blue-500 focus:border-blue-500 text-gray-700 w-full"
                    placeholder="Database password"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-xl font-medium mb-4">Webhook Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="walletAddress" className="text-sm text-gray-700 block mb-1 font-medium">
                    Wallet Address
                  </label>
                  <input
                    type="text"
                    name="walletAddress"
                    id="walletAddress"
                    value={formData.walletAddress}
                    onChange={handleInputChange}
                    className="bg-gray-100 border border-gray-200 rounded py-1 px-3 block focus:ring-blue-500 focus:border-blue-500 text-gray-700 w-full"
                    placeholder="Enter wallet address"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-700 block mb-2 font-medium">
                    Transaction Categories
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="transfer"
                        checked={formData.categories.transfer}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-500 focus:ring-blue-500 mr-2"
                      />
                      <span className="text-gray-700">Transfer</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="nft_bids"
                        checked={formData.categories.nft_bids}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-500 focus:ring-blue-500 mr-2"
                      />
                      <span className="text-gray-700">NFT Bids</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-x-4 mt-8">
              <button
                type="submit"
                disabled={loading}
                className="py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Setting up...
                  </>
                ) : "Setup Connection & Webhook"}
              </button>
            </div>
          </form>
        </div>

        {/* Webhooks List */}
        <div className="mt-8 p-8 rounded border border-gray-200 bg-white">
          <h2 className="text-xl font-medium mb-4">Your Webhooks</h2>
          {webhooks.length === 0 ? (
            <p className="text-gray-500">No webhooks found. Create one to get started.</p>
          ) : (
            <div className="space-y-4">
              {webhooks.map((webhook) => (
                <div
                  key={webhook.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">Wallet Address</h3>
                      <p className="text-sm text-gray-600">{webhook.walletAddress}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteWebhook(webhook.webhookId)}
                      className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="mt-2">
                    <h3 className="font-medium text-gray-900">Transaction Types</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {webhook.transactionTypes.map((type) => (
                        <span
                          key={type}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    Created: {new Date(webhook.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
