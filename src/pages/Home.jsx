import React, { useState, useContext } from "react";
import AppLayout from "./../components/layout/AppLayout";
import { Icon } from "@/components/ui/Icons";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import { AuthContext } from "../utils/AppContext";

const Home = ({ serviceData }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, apiKey, fetchBalance } = useContext(AuthContext);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value.toLowerCase());
    setSelectedService(null);
  };

  const handleServiceClick = (service) => {
    setSelectedService(service);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSelectedService(null);
  };

  const handleServerClick = async (serverNumber, serviceCode, isMultiple) => {
    if (!user || !apiKey) {
      navigate("/login"); // Redirect to login page
      return; // Stop further execution
    }

    if (loading) return;

    setLoading(true);

    const getNumberPromise = new Promise((resolve, reject) => {
      const getNumberRequest = async () => {
        try {
          const url = `/get-number?apikey=${apiKey}&code=${serviceCode}&server=${serverNumber}&otp=${isMultiple}`;
          console.log("Request URL:", url);

          await axios.get(url); // API Call
          await fetchBalance(apiKey);
          resolve(); // Resolve the promise on success
        } catch (error) {
          reject(error); // Reject the promise on error
        } finally {
          setLoading(false);
        }
      };
      getNumberRequest();
    });

    await toast.promise(getNumberPromise, {
      loading: "Processing Request...",
      success: () => {
        navigate("/my-orders");
        return "Number Bought Successfully!";
      },
      error: (error) => {
        const errorMessage = error.response?.data?.error || "Please try again.";
        return errorMessage;
      },
    });
  };

  const getFilteredServices = () => {
    let filteredServices = serviceData.filter((service) =>
      service.name.toLowerCase().includes(searchQuery)
    );

    // Fallback to "Any Other" if no matches
    if (filteredServices.length === 0) {
      const anyOtherService = serviceData.find(
        (service) => service.name.toLowerCase() === "any other"
      );

      if (anyOtherService) {
        filteredServices = [anyOtherService];
      }
    }

    return filteredServices;
  };

  const filteredServices = getFilteredServices();

  const formatPrice = (price) => {
    if (!price) return "0.00";
    const [integerPart, decimalPart] = price.split(".");
    return `${integerPart.padStart(2, "0")}.${decimalPart || "00"}`;
  };

  return (
    <div className="h-[calc(100dvh-4rem)] flex flex-col items-center justify-center">
      <div className="w-full flex justify-center my-8">
        <div className="w-full max-w-[720px] flex flex-col items-center bg-[#121315] rounded-2xl p-3 md:p-5">
          <div className="w-full flex bg-[#18191c] rounded-2xl items-center h-[60px] mb-3 px-3 md:px-5">
            <Icon.search className="text-[30px] text-primary" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full h-[50px] ml-2 bg-transparent border-0 text-base text-white placeholder:text-primary focus:outline-none"
            />
            {searchQuery !== "" && (
              <Icon.circleX
                className="text-primary cursor-pointer"
                onClick={clearSearch}
              />
            )}
          </div>
          <div className="flex flex-col w-full h-[450px] md:h-[340px]">
            <h5 className="p-3">
              {selectedService ? "Servers for Selected Service" : "Services"}
            </h5>
            <div className="rounded-2xl flex flex-col overflow-y-auto hide-scrollbar h-full">
              {selectedService ? (
                selectedService.servers
                  .sort((a, b) => parseInt(a.server) - parseInt(b.server)) // Sort servers by server number
                  .map((server, index) => (
                    <button
                      className="bg-[#282828] py-4 px-3 md:px-5 flex mb-1 w-full items-center justify-between rounded-lg"
                      key={index}
                      onClick={() =>
                        handleServerClick(
                          server.server,
                          server.code,
                          server.otp === "Multiple Otp"
                        )
                      }
                      disabled={loading}
                    >
                      <h3 className="capitalize font-medium flex flex-col items-start">
                        Server {server.serverNumber}
                        <span className="text-sm text-gray-400">
                          {server.otp}
                        </span>
                      </h3>
                      <div className="flex items-center">
                        <p className="text-base">{formatPrice(server.price)}</p>
                        <Icon.indianRupee className="w-4 h-4" />
                      </div>
                    </button>
                  ))
              ) : filteredServices.length > 0 ? (
                filteredServices.map((service, index) => (
                  <button
                    className="bg-[#282828] py-4 px-3 md:px-5 flex mb-1 w-full items-center justify-between rounded-lg"
                    key={index}
                    onClick={() => handleServiceClick(service)}
                  >
                    <h3 className="capitalize font-medium text-start">
                      {service.name}
                    </h3>
                  </button>
                ))
              ) : (
                <div className="text-white">No services found</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppLayout()(Home);
