import {createRoot} from 'react-dom/client';
import NeonApp from './NeonApp';
import {ViewBoundary} from './RecoverableView';
createRoot(document.getElementById('root')!).render(<ViewBoundary label="Snowlog"><NeonApp/></ViewBoundary>);
