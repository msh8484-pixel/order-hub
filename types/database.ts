export type Database = {
  public: {
    PostgrestVersion: "12";
    Tables: {
      stores: {
        Row: {
          id: string;
          name: string;
          slug: string;
          phone: string | null;
          address: string | null;
          manager_name: string | null;
          order_deadline: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          phone?: string | null;
          address?: string | null;
          manager_name?: string | null;
          order_deadline?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          phone?: string | null;
          address?: string | null;
          manager_name?: string | null;
          order_deadline?: string;
          is_active?: boolean;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          category: string;
          unit: string;
          price: number;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
          unit?: string;
          price?: number;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          unit?: string;
          price?: number;
          is_active?: boolean;
          sort_order?: number;
        };
      };
      orders: {
        Row: {
          id: string;
          order_date: string;
          source: string;
          source_order_no: string | null;
          store_id: string | null;
          customer_name: string | null;
          status: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_date?: string;
          source: string;
          source_order_no?: string | null;
          store_id?: string | null;
          customer_name?: string | null;
          status?: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_date?: string;
          source?: string;
          source_order_no?: string | null;
          store_id?: string | null;
          customer_name?: string | null;
          status?: string;
          note?: string | null;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          unit_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          quantity: number;
          unit_price?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          quantity?: number;
          unit_price?: number;
        };
      };
      users: {
        Row: {
          id: string;
          name: string;
          role: string;
          store_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          role?: string;
          store_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          role?: string;
          store_id?: string | null;
        };
      };
      chat_rooms: {
        Row: {
          id: string;
          name: string;
          type: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string;
          description?: string | null;
          is_active?: boolean;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          room_id: string;
          sender_name: string;
          sender_role: string;
          content: string;
          is_parsed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          sender_name: string;
          sender_role?: string;
          content: string;
          is_parsed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          sender_name?: string;
          sender_role?: string;
          content?: string;
          is_parsed?: boolean;
        };
      };
      parsed_orders: {
        Row: {
          id: string;
          message_id: string | null;
          room_id: string | null;
          order_date: string;
          product_name: string;
          quantity: number;
          raw_text: string | null;
          is_confirmed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id?: string | null;
          room_id?: string | null;
          order_date?: string;
          product_name: string;
          quantity: number;
          raw_text?: string | null;
          is_confirmed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string | null;
          room_id?: string | null;
          order_date?: string;
          product_name?: string;
          quantity?: number;
          raw_text?: string | null;
          is_confirmed?: boolean;
        };
      };
    };
  };
};
