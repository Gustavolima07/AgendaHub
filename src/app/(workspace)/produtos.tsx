import { Products } from '../../Pages/Products';
import { PageFrame } from '../../Components/PageFrame';
import { useAppActions } from '../../contexts/AppActions';
export default function ProductsRoute() {
  const actions = useAppActions();
  return (
    <PageFrame id="products">
      <Products {...actions} />
    </PageFrame>
  );
}
