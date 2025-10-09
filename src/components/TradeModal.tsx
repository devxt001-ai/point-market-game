import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { portfolioService, TradeType } from "@/services/portfolioService";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/sonner";

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  companyName: string;
  currentPrice: number;
  tradeType: TradeType;
  onTradeComplete?: () => void;
  avgBuyPrice?: number;
  heldQuantity?: number;
}

export function TradeModal({
  isOpen,
  onClose,
  symbol,
  companyName,
  currentPrice,
  tradeType,
  onTradeComplete,
  avgBuyPrice,
  heldQuantity,
}: TradeModalProps) {
  const { user } = useAuth();
  const [quantity, setQuantity] = useState<number>(1);
  const [totalCost, setTotalCost] = useState<number>(currentPrice);
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const isBuy = tradeType === "buy";
  const actionText = isBuy ? "Buy" : "Sell";
  const actionColor = isBuy ? "bg-success hover:bg-success/90" : "bg-destructive hover:bg-destructive/90";
  const perSharePL = !isBuy && typeof avgBuyPrice === "number" ? currentPrice - avgBuyPrice : null;
  const expectedPL = perSharePL !== null ? perSharePL * quantity : null;

  useEffect(() => {
    // Calculate total cost whenever quantity or price changes
    setTotalCost(quantity * currentPrice);
    
    // Fetch user balance
    if (user?.id) {
      portfolioService.getUserBalance(user.id).then((balance) => {
        if (balance) {
          setUserBalance(balance.wallet_balance);
        }
      });
    }
  }, [quantity, currentPrice, user?.id]);

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (isNaN(value) || value <= 0) {
      setQuantity(1);
      return;
    }
    // Clamp to heldQuantity for sell actions
    if (!isBuy && typeof heldQuantity === "number") {
      const clamped = Math.min(Math.max(1, value), Math.max(1, heldQuantity));
      setQuantity(clamped);
    } else {
      setQuantity(value);
    }
  };

  const handleTrade = async () => {
    if (!user?.id) {
      toast.error("You must be logged in to trade");
      return;
    }

    setIsLoading(true);
    try {
      const success = await portfolioService.executeTrade({
        userId: user.id,
        symbol,
        quantity,
        price: currentPrice,
        tradeType,
      });

      if (success) {
        onClose();
        if (onTradeComplete) {
          onTradeComplete();
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className={isBuy ? "text-success" : "text-destructive"}>
            {actionText} {symbol}
          </DialogTitle>
          <DialogDescription>{companyName}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 items-center gap-4">
            <Label htmlFor="current-price">Current Price</Label>
            <div className="text-right font-medium">
              ${currentPrice.toFixed(2)}
            </div>
          </div>
          <div className="grid grid-cols-2 items-center gap-4">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={!isBuy && typeof heldQuantity === "number" ? heldQuantity : undefined}
              value={quantity}
              onChange={handleQuantityChange}
              className="text-right"
            />
          </div>
          <div className="grid grid-cols-2 items-center gap-4">
            <Label htmlFor="total-cost">Total {isBuy ? "Cost" : "Proceeds"}</Label>
            <div className="text-right font-bold">
              ${totalCost.toFixed(2)}
            </div>
          </div>
          {!isBuy && typeof heldQuantity === "number" && (
            <div className="grid grid-cols-2 items-center gap-4">
              <Label>Available Shares</Label>
              <div className="text-right">{heldQuantity}</div>
            </div>
          )}
          {!isBuy && perSharePL !== null && (
            <div className="grid grid-cols-2 items-center gap-4">
              <Label>Per-Share P/L</Label>
              <div className={`text-right ${perSharePL >= 0 ? "text-success" : "text-destructive"}`}>
                ${perSharePL.toFixed(2)}
              </div>
            </div>
          )}
          {!isBuy && expectedPL !== null && (
            <div className="grid grid-cols-2 items-center gap-4">
              <Label>Expected P/L for {quantity}</Label>
              <div className={`text-right font-medium ${expectedPL >= 0 ? "text-success" : "text-destructive"}`}>
                ${expectedPL.toFixed(2)}
              </div>
            </div>
          )}
          {isBuy && userBalance !== null && (
            <div className="grid grid-cols-2 items-center gap-4">
              <Label>Available Balance</Label>
              <div className={`text-right ${userBalance < totalCost ? "text-destructive" : ""}`}>
                ${userBalance.toFixed(2)}
              </div>
            </div>
          )}
          {isBuy && userBalance !== null && userBalance < totalCost && (
            <div className="text-destructive text-sm">
              Insufficient funds for this purchase
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            className={actionColor}
            onClick={handleTrade}
            disabled={isLoading || (isBuy && userBalance !== null && userBalance < totalCost)}
          >
            {isLoading ? "Processing..." : `${actionText} ${symbol}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}