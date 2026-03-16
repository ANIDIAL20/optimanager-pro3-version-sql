"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getRecentNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/app/actions/persisted-notifications-actions";

export function useNotifications() {
  const queryClient = useQueryClient();

  const { data: response, isLoading } = useQuery({
    queryKey: ["notifications", "recent"],
    queryFn: () => getRecentNotifications(),
    staleTime: 60_000, // 1 minute
  });

  const notifications = (response?.success ? response.data : []) as any[];

  const { mutate: markAsRead } = useMutation({
    mutationFn: (id: string) => markNotificationAsRead(parseInt(id)),
    // Optimistic Update
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["notifications", "recent"] });
      const previousResponse = queryClient.getQueryData(["notifications", "recent"]) as any;

      if (previousResponse?.success) {
        queryClient.setQueryData(["notifications", "recent"], {
          ...previousResponse,
          data: previousResponse.data.map((n: any) => 
            n.id === parseInt(id) ? { ...n, isRead: true } : n
          )
        });
      }

      return { previousResponse };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(["notifications", "recent"], context?.previousResponse);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification-count"] });
    },
  });

  const { mutate: markAllAsRead, isPending: isMarkingAll } = useMutation({
    mutationFn: () => markAllNotificationsAsRead(),
    // Optimistic Update
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications", "recent"] });
      const previousResponse = queryClient.getQueryData(["notifications", "recent"]) as any;

      if (previousResponse?.success) {
        queryClient.setQueryData(["notifications", "recent"], {
          ...previousResponse,
          data: previousResponse.data.map((n: any) => ({ ...n, isRead: true }))
        });
      }

      return { previousResponse };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(["notifications", "recent"], context?.previousResponse);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notification-count"] });
    },
  });

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  return { 
    notifications, 
    isLoading, 
    unreadCount, 
    markAsRead, 
    markAllAsRead,
    isMarkingAll
  };
}
