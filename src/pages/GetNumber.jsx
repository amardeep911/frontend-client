import React, { useState, useEffect, useContext } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import axios from "axios";
import { AuthContext } from "@/utils/AppContext";
import { SnapLoader } from "@/components/layout/Loaders";
import toast from "react-hot-toast";
import PopoverComponent from "@/components/shared/PopoverComponent";
import { Icon } from "@/components/ui/Icons";

import { useNavigate } from "react-router-dom";

const GetNumber = () => {
  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, apiKey, fetchBalance, serviceData } = useContext(AuthContext);
  const [contextLoading, setContextLoading] = useState(true);
  const [buttonStates, setButtonStates] = useState({});
  const [otpError, setOtpError] = useState(false);
  const [loadingCancel, setLoadingCancel] = useState({});
  const [loadingBuyAgain, setLoadingBuyAgain] = useState({});

  const [popoverStates, setPopoverStates] = useState({});

  const fetchOrdersAndTransactions = async () => {
    try {
      const [ordersResponse, transactionsResponse] = await Promise.all([
        axios.get(`/orders?userId=${user.userId}`),
        axios.get(`/transaction-history?userId=${user.userId}`),
      ]);

      setOrders(ordersResponse.data);
      setTransactions(transactionsResponse.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data", error);
      setLoading(false);
    }
  };
  console.log(orders.map((order) => console.log(order)));
  console.log(orders);
  console.log(transactions);

  useEffect(() => {
    if (user) {
      fetchOrdersAndTransactions();
    }
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchBalance(apiKey); // Call the fetchBalance function
    }, 2000); // 2 seconds

    return () => clearInterval(interval); // Cleanup on component unmount
  }, [apiKey, fetchBalance]);

  const getTransaction = (numberId) => {
    const relatedTransaction = transactions.filter(
      (transaction) => transaction.id === numberId
    );
    console.log(relatedTransaction);
    return relatedTransaction;
  };
  const calculateRemainingTime = (server, orderTime) => {
    const now = new Date();
    let orderTimePlus;

    if (server == 7) {
      orderTimePlus = new Date(new Date(orderTime).getTime() + 10 * 60000);
    } else {
      orderTimePlus = new Date(new Date(orderTime).getTime() + 20 * 60000);
    }

    const timeDifference = orderTimePlus - now;
    if (timeDifference <= 0) return "00:00";

    const minutes = Math.floor(timeDifference / 60000);
    const seconds = Math.floor((timeDifference % 60000) / 1000);

    return `${minutes < 10 ? "0" : ""}${minutes}:${
      seconds < 10 ? "0" : ""
    }${seconds}`;
  };

  const Countdown = ({ server, orderTime, orderId }) => {
    const [remainingTime, setRemainingTime] = useState(() =>
      calculateRemainingTime(server, orderTime)
    );

    useEffect(() => {
      const updateRemainingTime = () => {
        const newRemainingTime = calculateRemainingTime(server, orderTime);
        const threshold = server === 7 ? "07" : "17";
        setRemainingTime((prevTime) => {
          if (prevTime !== newRemainingTime) {
            if (newRemainingTime === "00:00") {
              setButtonStates((prevStates) => ({
                ...prevStates,
                [orderId]: true,
              }));
              handleOrderExpire(orderId);
            } else if (newRemainingTime.split(":")[0] <= threshold) {
              setButtonStates((prevStates) => ({
                ...prevStates,
                [orderId]: true,
              }));
            }
            return newRemainingTime;
          }
          return prevTime;
        });
      };

      updateRemainingTime(); // Initial call
      const interval = setInterval(updateRemainingTime, 1000);

      return () => clearInterval(interval);
    }, [orderTime, orderId]);
    return <span className="font-mono">{remainingTime}</span>;
  };

  const handleOrderExpire = async (orderId) => {
    setOrders((prevOrders) =>
      prevOrders.filter((order) => order._id !== orderId)
    );
    await fetchBalance(apiKey);
  };

  const handleOrderCancel = async (
    orderId,
    numberId,
    server,
    hasOtp,
    userId
  ) => {
    setLoadingCancel((prev) => ({ ...prev, [orderId]: true }));

    try {
      let response;
      if (hasOtp) {
        response = await axios.post(
          `/cancel-order?userId=${userId}&id=${numberId}`
        );
        if (response.status === 200) {
          toast.success("Order finished successfully!");
        } else {
          throw new Error("Failed to finish the order.");
        }
      } else {
        response = await axios.get(
          `/number-cancel?apikey=${apiKey}&id=${numberId}&server=${server}`
        );

        if (response.status === 200) {
          toast.success("Number cancelled successfully!");
        } else {
          throw new Error("Failed to cancel the number.");
        }
      }

      setOrders((prevOrders) =>
        prevOrders.filter((order) => order._id !== orderId)
      );

      await fetchBalance(apiKey);
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || "Error cancelling the Number!";
      toast.error(errorMessage);
    } finally {
      setLoadingCancel((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleBuyAgain = async (order) => {
    const service = serviceData.find((item) => item.name === order.service);

    if (!service) {
      console.error(`Service ${order.service} not found in serviceData`);
      return;
    }

    const serverDetails = service.servers.find(
      (server) => server.server === order.server.toString()
    );

    if (!serverDetails) {
      console.error(
        `Server ${order.server} not found for service ${order.service}`
      );
      return;
    }

    const isMultiple = serverDetails.otp === "Multiple Otp";

    setLoadingBuyAgain((prev) => ({ ...prev, [order._id]: true }));

    try {
      await axios.get(
        `/get-number?apikey=${apiKey}&code=${serverDetails.code}&server=${
          order.server
        }&otptype=${isMultiple ? "multiple" : "single"}`
      );

      await fetchOrdersAndTransactions(); // Fetch updated orders
      toast.success("Number bought again successfully!");
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        "Error buying the number again. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoadingBuyAgain((prev) => ({ ...prev, [order._id]: false }));
      await fetchBalance(apiKey); // Trigger balance update
    }
  };

  const handleGetOtp = async (orders) => {
    try {
      for (const order of orders) {
        const { server, numberId } = order;
        // Fetch OTP for each order
        await axios.get(
          `/get-otp?apikey=${apiKey}&server=${server}&id=${numberId}`
        );
      }

      // Fetch updated transactions and orders after processing OTPs
      const [updatedOrdersResponse, updatedTransactionsResponse] =
        await Promise.all([
          axios.get(`/orders?userId=${user.userId}`),
          axios.get(`/transaction-history?userId=${user.userId}`),
        ]);

      // Update state with the latest data
      setOrders(updatedOrdersResponse.data);
      setTransactions(updatedTransactionsResponse.data);

      setOtpError(false); // Reset error state on success
    } catch (error) {
      console.error("Error fetching OTP", error);

      if (error.response?.status === 404) {
        // Stop polling if it's a 404 error
        console.error("Stopping polling due to 404 Not Found error");
        setOtpError(true);
      }
      // Do nothing for other errors (continue polling)
    }
  };

  useEffect(() => {
    let interval;

    if (!otpError) {
      interval = setInterval(() => {
        handleGetOtp(orders);
      }, 5000);
    }

    return () => clearInterval(interval);
  }, [orders, otpError]); // Depend on otpError to manage the interval

  const handleCopy = (number, orderId) => {
    setPopoverStates((prev) => ({ ...prev, [orderId]: true }));
    navigator.clipboard.writeText(number);
  };
  return (
    <div className="h-[calc(100dvh-4rem)] overflow-y-auto hide-scrollbar">
      {loading ? (
        <div className="w-full flex h-full justify-center items-center">
          <SnapLoader />
        </div>
      ) : orders.length === 0 ? (
        <div className="h-[calc(100dvh-4rem)]  flex items-center justify-center relative">
          <h1 className="text-[28px] lg:text-[55px] leading-[30px] lg:leading-[55px] font-[600] lg:font-[500] text-center absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <span className="text-primary">No</span> Active Orders
          </h1>
        </div>
      ) : (
        orders.map((order) => {
          console.log(order);
          const hasOtp = getTransaction(order.numberId).some(
            (transaction) =>
              Array.isArray(transaction.otp) && transaction.otp.length > 0
          );

          return (
            <div className="w-full flex justify-center my-12" key={order._id}>
              <div className="w-full max-w-[520px] flex flex-col items-center border-2 border-[#1b1d21] bg-[#121315] rounded-2xl p-5">
                <div className="w-full flex flex-col items-center px-4 mb-4 text-sm font-normal gap-y-2">
                  <div className="w-full flex text-center items-center justify-between">
                    <p>Service:</p>
                    <span> {order.service}</span>
                  </div>
                  <hr className="border-[#888888] border w-full" />
                  <div className="w-full flex text-center items-center justify-between">
                    <p>Server:</p>
                    <span> {order.server}</span>
                  </div>
                  <hr className="border-[#888888] border w-full" />
                  <div className="w-full flex text-center items-center justify-between">
                    <p>Price:</p>
                    <span> ₹{order.price}</span>
                  </div>
                  <hr className="border-[#888888] border w-full" />
                  <div className="w-full flex text-center items-center justify-between">
                    <p>Otp Type:</p>
                    <span> {order.numberType}</span>
                  </div>
                </div>

                <div className="w-full flex border rounded-2xl items-center justify-center h-[45px]">
                  <p className="py-4 px-5 flex w-full gap-4 items-center justify-center rounded-lg text-xl font-medium">
                    <span>+91&nbsp;{order.number}</span>
                    <PopoverComponent
                      buttonComponent={
                        <Button
                          variant="link"
                          className="p-0 h-0"
                          onClick={() => handleCopy(order.number, order._id)}
                        >
                          <Icon.copy className="w-4 h-4" />
                        </Button>
                      }
                      popoverContent="Copied!"
                      open={popoverStates[order._id] || false}
                      setOpen={(isOpen) =>
                        setPopoverStates((prev) => ({
                          ...prev,
                          [order._id]: isOpen,
                        }))
                      }
                    />
                  </p>
                </div>
                <div className="w-full flex rounded-2xl items-center justify-center h-[60px]">
                  <div className="bg-transparent max-w-56 py-4 px-5 flex w-full items-center justify-between rounded-lg">
                    <p className="font-normal">Remaining Time</p>
                    <Countdown
                      server={order.server}
                      orderTime={order.orderTime}
                      orderId={order._id}
                    />
                  </div>
                </div>
                <div className="w-full flex bg-[#444444] border-2 border-[#888888] rounded-2xl items-center justify-center max-h-[100px] overflow-y-scroll overflow-hidden hide-scrollbar">
                  <div className="w-full h-full flex flex-col items-center">
                    {getTransaction(order.numberId).map(
                      (transaction) => (
                        console.log(transaction.otp),
                        (
                          <React.Fragment key={transaction.id}>
                            {transaction.status === "PENDING" &&
                            transaction.otp.length === 0 ? (
                              <div className="bg-transparent py-4 px-5 flex w-full items-center justify-center">
                                <h3 className="font-normal text-sm">
                                  Waiting For Sms
                                </h3>
                              </div>
                            ) : transaction.status === "CANCELLED" ? (
                              <div className="bg-transparent py-4 px-5 flex w-full items-center justify-center">
                                <h3 className="font-normal text-sm">
                                  ACTIVATION EXPIRED
                                </h3>
                              </div>
                            ) : transaction.otp.length > 0 ? (
                              [...transaction.otp]
                                .reverse()

                                .map((otp, index, arr) => (
                                  <React.Fragment key={index}>
                                    <div className="bg-transparent py-4 px-5 flex w-full items-center justify-center">
                                      <h3 className="font-normal text-sm">
                                        {otp}
                                      </h3>
                                    </div>
                                    {index < arr.length - 1 && (
                                      <hr className="border-[#888888] border w-full" />
                                    )}
                                  </React.Fragment>
                                ))
                            ) : null}
                          </React.Fragment>
                        )
                      )
                    )}
                  </div>
                </div>

                <div className="w-full flex rounded-2xl items-center justify-center mb-2">
                  <div className="bg-transparent pt-4 flex w-full items-center justify-center gap-4">
                    <Button
                      className="py-2 px-9 rounded-full border-2 border-primary font-normal bg-primary text-white hover:bg-teal-600 transition-colors duration-200 ease-in-out"
                      onClick={() =>
                        handleOrderCancel(
                          order._id,
                          order.numberId,
                          order.server,
                          hasOtp,
                          order.userId
                        )
                      }
                      isLoading={loadingCancel[order._id]}
                      disabled={
                        loadingCancel[order._id] ||
                        (!buttonStates[order._id] && !hasOtp)
                      }
                    >
                      {console.log(hasOtp)}
                      {hasOtp ? "Finish" : "Cancel"}
                    </Button>
                    <Button
                      className="py-2 px-6 rounded-full border-2 border-primary font-normal bg-transparent text-primary hover:bg-primary hover:text-white transition-colors duration-200 ease-in-out"
                      onClick={() => handleBuyAgain(order)}
                      isLoading={loadingBuyAgain[order._id]}
                    >
                      Buy Again
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default AppLayout()(GetNumber);
