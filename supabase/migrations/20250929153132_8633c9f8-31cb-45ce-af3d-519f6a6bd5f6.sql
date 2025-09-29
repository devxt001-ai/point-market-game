-- Create users table for extended profile data
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  wallet_balance DECIMAL(15,2) DEFAULT 10000.00,
  subscription_status TEXT DEFAULT 'free',
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  total_portfolio_value DECIMAL(15,2) DEFAULT 10000.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stocks table for available trading symbols
CREATE TABLE public.stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  current_price DECIMAL(10,4) DEFAULT 0,
  price_change DECIMAL(10,4) DEFAULT 0,
  price_change_percent DECIMAL(5,2) DEFAULT 0,
  volume BIGINT DEFAULT 0,
  market_cap BIGINT,
  is_active BOOLEAN DEFAULT true,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trades table for buy/sell transactions
CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  stock_symbol TEXT NOT NULL,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell')),
  order_type TEXT NOT NULL CHECK (order_type IN ('market', 'limit')),
  quantity INTEGER NOT NULL,
  price_per_share DECIMAL(10,4) NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  limit_price DECIMAL(10,4),
  status TEXT DEFAULT 'executed' CHECK (status IN ('pending', 'executed', 'cancelled')),
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create portfolio table for current holdings
CREATE TABLE public.portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  stock_symbol TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  average_buy_price DECIMAL(10,4) NOT NULL DEFAULT 0,
  total_invested DECIMAL(15,2) NOT NULL DEFAULT 0,
  current_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  unrealized_pnl DECIMAL(15,2) NOT NULL DEFAULT 0,
  realized_pnl DECIMAL(15,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, stock_symbol)
);

-- Create subscriptions table for premium features
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('basic', 'premium', 'pro')),
  price DECIMAL(10,2) NOT NULL,
  bonus_points DECIMAL(15,2) DEFAULT 0,
  features JSONB DEFAULT '{}',
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create leaderboard table for rankings
CREATE TABLE public.leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  portfolio_value DECIMAL(15,2) NOT NULL,
  daily_change DECIMAL(15,2) DEFAULT 0,
  daily_change_percent DECIMAL(5,2) DEFAULT 0,
  weekly_change DECIMAL(15,2) DEFAULT 0,
  monthly_change DECIMAL(15,2) DEFAULT 0,
  all_time_change DECIMAL(15,2) DEFAULT 0,
  rank_position INTEGER,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create wallet_transactions table for tracking balance changes
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'trade', 'subscription', 'bonus')),
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert some default stocks for trading
INSERT INTO public.stocks (symbol, company_name, current_price, market_cap) VALUES
('AAPL', 'Apple Inc.', 150.00, 2400000000000),
('TSLA', 'Tesla Inc.', 200.00, 630000000000),
('GOOGL', 'Alphabet Inc.', 2500.00, 1600000000000),
('AMZN', 'Amazon.com Inc.', 3200.00, 1600000000000),
('NVDA', 'NVIDIA Corporation', 400.00, 980000000000),
('META', 'Meta Platforms Inc.', 280.00, 710000000000),
('NFLX', 'Netflix Inc.', 450.00, 200000000000);

-- Create function to update portfolio value
CREATE OR REPLACE FUNCTION public.update_portfolio_value()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user's total portfolio value
  UPDATE public.users 
  SET total_portfolio_value = wallet_balance + COALESCE((
    SELECT SUM(current_value) 
    FROM public.portfolio 
    WHERE user_id = NEW.user_id
  ), 0),
  updated_at = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for portfolio value updates
CREATE TRIGGER update_user_portfolio_value
  AFTER INSERT OR UPDATE ON public.portfolio
  FOR EACH ROW
  EXECUTE FUNCTION public.update_portfolio_value();

-- Create function to update leaderboard
CREATE OR REPLACE FUNCTION public.update_leaderboard()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update leaderboard entry
  INSERT INTO public.leaderboard (user_id, username, avatar_url, portfolio_value)
  VALUES (NEW.id, NEW.username, NEW.avatar_url, NEW.total_portfolio_value)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    username = NEW.username,
    avatar_url = NEW.avatar_url,
    portfolio_value = NEW.total_portfolio_value,
    last_updated = NOW();
  
  -- Update rankings
  WITH ranked_users AS (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY portfolio_value DESC) as new_rank
    FROM public.leaderboard
  )
  UPDATE public.leaderboard 
  SET rank_position = ranked_users.new_rank
  FROM ranked_users
  WHERE public.leaderboard.user_id = ranked_users.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for leaderboard updates
CREATE TRIGGER update_leaderboard_trigger
  AFTER UPDATE OF total_portfolio_value ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_leaderboard();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  username_value TEXT;
  counter INTEGER := 0;
BEGIN
  -- Get the base username
  username_value := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  
  -- Handle username uniqueness by adding a counter if needed
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = username_value) LOOP
    counter := counter + 1;
    username_value := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)) || counter::TEXT;
  END LOOP;
  
  INSERT INTO public.users (auth_user_id, username, email, avatar_url)
  VALUES (
    NEW.id,
    username_value,
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_trades_user_id ON public.trades(user_id);
CREATE INDEX idx_trades_stock_symbol ON public.trades(stock_symbol);
CREATE INDEX idx_portfolio_user_id ON public.portfolio(user_id);
CREATE INDEX idx_leaderboard_portfolio_value ON public.leaderboard(portfolio_value DESC);
CREATE INDEX idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);